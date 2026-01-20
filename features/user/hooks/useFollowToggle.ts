/**
 * File Name : features/user/hooks/useFollowToggle.ts
 * Description : 팔로우/언팔 API 래퍼(낙관 업데이트 + 서버 정합 보정 + followDelta 이벤트 발행)
 * Author : 임도헌
 *
 * Key Points
 * - 서버 응답(delta/isFollowing/counts)을 SSOT로 사용해 멱등/경합 상황에서도 최종 상태를 맞춘다.
 * - refresh 기본값은 false(모달 UX 보호). 필요 시 상위(헤더)에서만 opt-in 한다.
 * - 성공 흐름에서 followDelta 이벤트를 1회 발행하여 화면 간(헤더/모달/카드) 동기화를 돕는다.
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.26  임도헌   Created   follow/unfollow 래핑
 * 2025.09.06  임도헌   Modified  toggle/isPending/낙관/토스트
 * 2025.10.29  임도헌   Modified  멱등/경합 롤백 처리 개선
 * 2025.10.31  임도헌   Modified  서버 정합성 보정 + 기본 refresh:false + followDelta 이벤트 발행
 * 2025.12.27  임도헌   Modified  back/forward stale 대응: followDelta에 viewerId 포함 + 서버 counts/isFollowing 기반 전역 동기화 강화
 * 2025.12.31  임도헌   Modified  멱등(delta=0)에서 낙관 rollback 조건 개선(서버 상태와 낙관 결과가 같으면 rollback 스킵)
 * 2026.01.06  임도헌   Modified  rollback 기준을 delta가 아닌 SSOT(isFollowing)로 단순화(SSOT 확정 후 되돌림 방지)
 * 2026.01.16  임도헌   Moved     hooks -> hooks/user
 * 2026.01.18  임도헌   Moved     hooks/user -> features/user/hooks
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { emitFollowDelta } from "@/features/user/lib/follow/followDeltaClient";
import { toast } from "sonner";

type Counts = { viewerFollowing?: number; targetFollowers?: number };

type Opts = {
  viewerId?: number | null;

  /** 낙관 업데이트(선택): 호출자가 헤더/리스트를 즉시 바꾸고 싶을 때 사용 */
  onOptimistic?(): void;
  /** 롤백(선택): 네트워크/서버 오류 또는 "낙관 결과가 서버 SSOT와 다를 때"만 호출 */
  onRollback?(): void;

  /** 기본 false: 모달 UX 보호(스크롤/포커스/무한스크롤 상태 유지). 필요 시 상위에서만 true */
  refresh?: boolean;

  onRequireLogin?(): void;

  /**
   * 카운트 변화(선택):
   * - 서버 delta를 그대로 전달한다(멱등/경합이면 0)
   * - 호출자는 이 delta를 기반으로 followerCount/followersList 등을 업데이트한다.
   */
  onFollowersChange?(delta: number): void;

  /**
   * 낙관 결과(선택):
   * - 호출자가 전달하지 않으면 기본은 "!isFollowingNow"로 간주한다.
   * - 서버 SSOT(isFollowing)와 다를 때만 rollback을 호출한다.
   */
  optimisticNextIsFollowing?: boolean;

  /** 서버 기준 정합성 보정(선택) */
  onReconcileServerState?(payload: {
    isFollowing: boolean;
    counts?: Counts;
  }): void;
};

async function readJSON(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

export function useFollowToggle() {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const setPending = useCallback((userId: number, v: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (v) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const isPending = useCallback(
    (id: number) => pendingIds.has(id),
    [pendingIds]
  );

  const doFollow = useCallback(async (userId: number) => {
    const r = await fetch(`/api/users/${userId}/follow`, {
      method: "POST",
      cache: "no-store",
    });
    if (r.status === 401) return { auth: false, delta: 0 as number };
    if (!r.ok) throw new Error(`FOLLOW_FAILED(${r.status})`);
    const data = await readJSON(r);
    return {
      auth: true,
      delta: Number(data?.delta ?? 0),
      isFollowing: !!data?.isFollowing,
      counts: data?.counts as Counts | undefined,
    };
  }, []);

  const doUnfollow = useCallback(async (userId: number) => {
    const r = await fetch(`/api/users/${userId}/follow`, {
      method: "DELETE",
      cache: "no-store",
    });
    if (r.status === 401) return { auth: false, delta: 0 as number };
    if (!r.ok) throw new Error(`UNFOLLOW_FAILED(${r.status})`);
    const data = await readJSON(r);
    return {
      auth: true,
      delta: Number(data?.delta ?? 0),
      isFollowing: !!data?.isFollowing,
      counts: data?.counts as Counts | undefined,
    };
  }, []);

  const toggle = useCallback(
    async (userId: number, isFollowingNow: boolean, opts?: Opts) => {
      // 같은 대상(userId)에 대한 동시 요청을 막아 "중복 클릭/경합"을 최소화한다.
      if (isPending(userId)) return;
      setPending(userId, true);

      // 낙관 결과:
      // - 호출자가 명시하지 않으면 "현재 상태의 반대"라고 가정한다.
      const optimisticNext =
        typeof opts?.optimisticNextIsFollowing === "boolean"
          ? opts.optimisticNextIsFollowing
          : !isFollowingNow;

      // 낙관 업데이트(선택)
      opts?.onOptimistic?.();

      try {
        const { auth, delta, isFollowing, counts } = isFollowingNow
          ? await doUnfollow(userId)
          : await doFollow(userId);

        if (!auth) {
          // 401: 낙관 상태 원복 + 상위에서 로그인 유도
          opts?.onRollback?.();
          opts?.onRequireLogin?.();
          toast.error("로그인이 필요합니다.");
          return;
        }

        const serverIsFollowing = !!isFollowing;

        // Step 1) 서버 delta 기반 사용자 피드백/로컬 카운트 반영
        if (delta > 0) toast.success("팔로우 했습니다.");
        else if (delta < 0) toast.success("언팔로우 했습니다.");
        else {
          // 멱등: 상황에 맞게 안내(선택)
          toast(
            serverIsFollowing
              ? "이미 팔로우 중입니다."
              : "이미 언팔로우 상태입니다."
          );
        }
        opts?.onFollowersChange?.(delta);

        // Step 2) SSOT로 최종 확정(항상)
        opts?.onReconcileServerState?.({
          isFollowing: serverIsFollowing,
          counts,
        });

        // Step 3) 롤백(필요할 때만):
        // - delta가 아니라 "서버 SSOT vs 낙관 결과"로 판단한다.
        // - SSOT 확정 후 rollback이 상태를 다시 뒤집는 일을 방지한다.
        if (serverIsFollowing !== optimisticNext) {
          opts?.onRollback?.();
        }

        // Step 4) 전역 델타 이벤트 발행(성공 흐름에서 1회)
        emitFollowDelta({
          targetUserId: userId,
          viewerId: opts?.viewerId ?? null,
          delta: (delta > 0 ? 1 : delta < 0 ? -1 : 0) as 1 | -1 | 0,
          server: { isFollowing: serverIsFollowing, counts },
        });
      } catch (e) {
        console.error(e);
        // 네트워크/서버 오류: 낙관 상태 원복
        opts?.onRollback?.();
        toast.error("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setPending(userId, false);

        // refresh:
        // - 기본 false(모달 UX 보호)
        // - 필요 시 상위(헤더 단독 화면)에서만 opt-in
        if (opts?.refresh === true) router.refresh();
      }
    },
    [doFollow, doUnfollow, isPending, router, setPending]
  );

  const follow = useCallback(
    (id: number, opts?: Opts) => toggle(id, false, opts),
    [toggle]
  );
  const unfollow = useCallback(
    (id: number, opts?: Opts) => toggle(id, true, opts),
    [toggle]
  );

  return useMemo(
    () => ({ follow, unfollow, toggle, isPending }),
    [follow, unfollow, toggle, isPending]
  );
}
