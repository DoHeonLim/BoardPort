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
 * 2026.01.24  임도헌   Modified  Server Action 전환 (API Route 제거)
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { emitFollowDelta } from "@/features/user/utils/delta";
import { toast } from "sonner";
import { toggleFollowAction } from "@/features/user/actions/follow";

type Counts = { viewerFollowing?: number; targetFollowers?: number };

type Opts = {
  viewerId?: number | null;
  onOptimistic?(): void;
  onRollback?(): void;
  refresh?: boolean; // 성공 후 router.refresh() 여부
  onRequireLogin?(): void;
  onFollowersChange?(delta: number): void;
  optimisticNextIsFollowing?: boolean;
  onReconcileServerState?(payload: {
    isFollowing: boolean;
    counts?: Counts;
  }): void;
};

/**
 * 팔로우/언팔로우 토글 훅
 *
 * [기능]
 * 1. 팔로우/언팔로우 API를 호출하고, 결과를 처리합니다.
 * 2. 낙관적 업데이트(Optimistic Update)를 지원하여 UI 반응성을 높입니다.
 * 3. 실패 시 롤백(Rollback) 로직을 수행합니다.
 * 4. 성공 시 `emitFollowDelta` 이벤트를 발행하여 전역 상태(다른 컴포넌트)를 동기화합니다.
 * 5. 중복 요청 방지(Pending 상태 관리)를 수행합니다.
 */
export function useFollowToggle() {
  const router = useRouter();
  // 중복 요청 방지 (ID별)
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

  /**
   * 팔로우 상태 토글
   */
  const toggle = useCallback(
    async (userId: number, isFollowingNow: boolean, opts?: Opts) => {
      if (isPending(userId)) return;
      setPending(userId, true);

      // 낙관적 상태 계산
      const optimisticNext =
        typeof opts?.optimisticNextIsFollowing === "boolean"
          ? opts.optimisticNextIsFollowing
          : !isFollowingNow;

      // 1. UI 즉시 반영 (Optimistic)
      opts?.onOptimistic?.();

      try {
        const intent = isFollowingNow ? "unfollow" : "follow";

        // 2. 서버 요청
        const res = await toggleFollowAction(userId, intent);

        if (!res.success) {
          if (res.code === "UNAUTHORIZED") {
            opts?.onRollback?.();
            opts?.onRequireLogin?.();
            toast.error("로그인이 필요합니다.");
          } else {
            throw new Error(res.error);
          }
          return;
        }

        const { changed, delta, isFollowing, counts } = res;

        // 3. 결과 알림
        if (changed) {
          toast.success(
            intent === "follow" ? "팔로우 했습니다." : "언팔로우 했습니다."
          );
        } else {
          // 이미 상태가 변경된 경우 (멱등성)
          toast(
            isFollowing ? "이미 팔로우 중입니다." : "이미 언팔로우 상태입니다."
          );
        }

        // 4. 콜백 호출 (카운트 갱신 등)
        opts?.onFollowersChange?.(delta);
        opts?.onReconcileServerState?.({ isFollowing, counts });

        // 낙관적 결과와 서버 결과가 다르면 롤백
        if (isFollowing !== optimisticNext) {
          opts?.onRollback?.();
        }

        // 5. 전역 이벤트 발행 (다른 컴포넌트 동기화)
        emitFollowDelta({
          targetUserId: userId,
          viewerId: opts?.viewerId ?? null,
          delta: delta as 1 | -1 | 0,
          server: { isFollowing, counts },
        });
      } catch (e) {
        console.error(e);
        opts?.onRollback?.(); // 에러 시 롤백
        toast.error("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setPending(userId, false);
        if (opts?.refresh === true) router.refresh();
      }
    },
    [isPending, router, setPending]
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
