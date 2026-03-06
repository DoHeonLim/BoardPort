/**
 * File Name : features/user/hooks/useFollowToggle.ts
 * Description : 팔로우/언팔로우 토글 API 래퍼 (이벤트 버스 제거 및 Query Cache 직접 갱신)
 * Author : 임도헌
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
 * 2026.03.01  임도헌   Modified  delta.ts(CustomEvent) 의존성 제거 및 queryClient.setQueryData 기반 전역 상태 갱신 적용
 * 2026.03.03  임도헌   Modified  전역 캐시 조작 로직 보완
 * 2026.03.05  임도헌   Modified   주석 최신화
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { toggleFollowAction } from "@/features/user/actions/follow";

/**
 * 팔로우/언팔로우 토글 액션 및 낙관적 상태 갱신 훅
 *
 * [상태 추출 및 사이드 이펙트 제어 로직]
 * - `toggleFollowAction` 서버 액션을 호출하여 팔로우 상태 변경 데이터 영속화
 * - `queryClient.setQueryData`를 활용한 헤더 팔로우 통계(`users.followStats`) 즉각적인 캐시 병합(Optimistic Update) 적용
 * - `queryClient.setQueriesData`를 통한 스트리밍 목록 내 팔로워 전용 방송 잠금(`followersOnlyLocked`) 상태 실시간 동기화 처리
 * - 모달 리스트 내부 상태 최신화를 위한 `queryKeys.follows.all` 무효화 유도
 */
export function useFollowToggle() {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const isPending = useCallback(
    (id: number) => pendingIds.has(id),
    [pendingIds]
  );

  const toggle = useCallback(
    async (userId: number, isFollowingNow: boolean, opts?: any) => {
      if (isPending(userId)) return;
      setPendingIds((prev) => new Set(prev).add(userId));

      try {
        const intent = isFollowingNow ? "unfollow" : "follow";
        const res = await toggleFollowAction(userId, intent);

        if (!res.success) {
          if (res.code === "UNAUTHORIZED") {
            opts?.onRequireLogin?.();
            toast.error("로그인이 필요합니다.");
          }
          return;
        }

        const delta = res.changed ? (intent === "follow" ? 1 : -1) : 0;

        // 1. 헤더 통계 갱신 (users 도메인 캐시 직접 조작)
        queryClient.setQueryData(
          queryKeys.users.followStats(userId),
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              isFollowing: res.isFollowing,
              followerCount: Math.max(0, old.followerCount + delta),
            };
          }
        );

        // 2. 스트리밍 목록에서 Followers 잠금 상태 해제/설정 동기화를 적용
        queryClient.setQueriesData(
          { queryKey: queryKeys.streams.lists() },
          (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                streams: page.streams.map((stream: any) => {
                  // 대상 유저의 방송이고 FOLLOWERS 전용일 경우에만 잠금 플래그를 변경
                  if (
                    stream.user.id === userId &&
                    stream.visibility === "FOLLOWERS"
                  ) {
                    return { ...stream, followersOnlyLocked: !res.isFollowing };
                  }
                  return stream;
                }),
              })),
            };
          }
        );

        // 3. 모달 리스트 데이터 갱신을 위해 무효화 처리를 수행
        queryClient.invalidateQueries({ queryKey: queryKeys.follows.all });
      } catch (e) {
        console.error("Toggle Follow Error:", e);
        toast.error("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [isPending, queryClient]
  );

  return useMemo(() => ({ toggle, isPending }), [toggle, isPending]);
}
