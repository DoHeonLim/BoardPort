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
 * 2026.03.07  임도헌   Modified   서버가 반환한 팔로우 실패 사유를 토스트로 직접 노출
 * 2026.03.17  임도헌   Modified  모달 내 토글 시 viewer 자신의 followingCount와 row 상태도 즉시 갱신되도록 캐시 동기화 보강
 * 2026.03.27  임도헌   Modified  스트림 상세에서 팔로우 직후 전체 방송의 팔로잉 탭이 즉시 갱신되도록 기본 following 목록 캐시 시딩 및 stale 처리 보강
 * 2026.03.31  임도헌   Modified  훅 역할과 캐시 동기화 맥락이 보이도록 설명 톤 통일
 * 2026.05.08  임도헌   Modified  팔로우 액션 결과 타입 import 경로를 user types로 정리
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { toggleFollowAction } from "@/features/user/actions/follow";
import type { FollowActionResult } from "@/features/user/types";

const DEFAULT_STREAM_LIST_FILTERS = { category: "", keyword: "" } as const;

/**
 * 팔로우/언팔로우 토글 액션 및 낙관적 상태 갱신 훅
 *
 * [기능]
 * - `toggleFollowAction` 서버 액션을 호출해 팔로우 상태 변경을 처리
 * - 헤더 통계, 모달 row, 스트리밍 팔로잉 목록 캐시를 함께 동기화
 * - 낙관적 갱신과 서버 확정 상태를 같은 queryClient 기준으로 맞춤
 */
export function useFollowToggle() {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const isPending = useCallback(
    (id: number) => pendingIds.has(id),
    [pendingIds]
  );

  const toggle = useCallback(
    async (
      userId: number,
      isFollowingNow: boolean,
      opts?: any
    ): Promise<FollowActionResult | undefined> => {
      if (isPending(userId)) return;
      setPendingIds((prev) => new Set(prev).add(userId));

      try {
        const intent = isFollowingNow ? "unfollow" : "follow";
        const res = await toggleFollowAction(userId, intent);

        if (!res.success) {
          if (res.code === "UNAUTHORIZED") {
            opts?.onRequireLogin?.();
            toast.error("로그인이 필요합니다.");
          } else {
            toast.error(res.error);
          }
          return res;
        }

        const delta = res.changed ? (intent === "follow" ? 1 : -1) : 0;

        // 헤더 통계 갱신
        // profile/channel 상단 카운트와 버튼 상태를 같은 기준으로 즉시 동기화
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

        if (opts?.viewerId != null) {
          // viewer 자신의 followingCount 동기화
          // 모달 안 토글 후에도 헤더 숫자가 늦게 남지 않도록 즉시 반영
          queryClient.setQueryData(
            queryKeys.users.followStats(opts.viewerId),
            (old: any) => {
              if (!old) return old;
              return {
                ...old,
                followingCount: res.counts.viewerFollowing,
              };
            }
          );
        }

        queryClient.setQueriesData(
          { queryKey: queryKeys.follows.all },
          (oldData: any) => {
            if (!oldData?.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                users: page.users.map((user: any) =>
                  user.id === userId
                    ? { ...user, isFollowedByViewer: res.isFollowing }
                    : user
                ),
              })),
            };
          }
        );

        // 스트리밍 목록 캐시 동기화
        // followersOnly 잠금 상태와 기본 "팔로잉" 탭 시드를 함께 맞춰 탭 전환 지연을 줄임
        const streamQueryEntries = queryClient.getQueriesData({
          queryKey: queryKeys.streams.lists(),
        });
        const targetUserStreams = new Map<number, any>();

        for (const [, data] of streamQueryEntries) {
          if (!data || !(data as any).pages) continue;

          for (const page of (data as any).pages) {
            for (const stream of page?.streams ?? []) {
              if (stream?.user?.id !== userId) continue;
              targetUserStreams.set(stream.id, {
                ...stream,
                followersOnlyLocked:
                  stream.visibility === "FOLLOWERS" ? !res.isFollowing : false,
              });
            }
          }
        }

        for (const [queryKey] of streamQueryEntries) {
          const scope = Array.isArray(queryKey) ? queryKey[2] : undefined;

          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData?.pages) return oldData;

            return {
              ...oldData,
              pages: oldData.pages.map((page: any, pageIndex: number) => {
                let streams = (page.streams ?? []).map((stream: any) => {
                  if (
                    stream?.user?.id === userId &&
                    stream.visibility === "FOLLOWERS"
                  ) {
                    return {
                      ...stream,
                      followersOnlyLocked: !res.isFollowing,
                    };
                  }
                  return stream;
                });

                if (scope === "following") {
                  if (res.isFollowing && pageIndex === 0) {
                    const existingIds = new Set(
                      streams.map((stream: any) => stream.id)
                    );
                    streams = [
                      ...Array.from(targetUserStreams.values()).filter(
                        (stream: any) => !existingIds.has(stream.id)
                      ),
                      ...streams,
                    ];
                  } else if (!res.isFollowing) {
                    streams = streams.filter(
                      (stream: any) => stream?.user?.id !== userId
                    );
                  }
                }

                return { ...page, streams };
              }),
            };
          });
        }

        if (res.isFollowing && targetUserStreams.size > 0) {
          const defaultFollowingKey = queryKeys.streams.list(
            "following",
            DEFAULT_STREAM_LIST_FILTERS
          );

          queryClient.setQueryData(defaultFollowingKey, (oldData: any) => {
            const seededStreams = Array.from(targetUserStreams.values());

            if (!oldData?.pages) {
              return {
                pages: [{ streams: seededStreams, nextCursor: null }],
                pageParams: [null],
              };
            }

            const firstPage = oldData.pages[0] ?? {
              streams: [],
              nextCursor: null,
            };
            const existingIds = new Set(
              (firstPage.streams ?? []).map((stream: any) => stream.id)
            );

            return {
              ...oldData,
              pages: [
                {
                  ...firstPage,
                  streams: [
                    ...seededStreams.filter(
                      (stream: any) => !existingIds.has(stream.id)
                    ),
                    ...(firstPage.streams ?? []),
                  ],
                },
                ...oldData.pages.slice(1),
              ],
            };
          });

          queryClient.invalidateQueries({ queryKey: defaultFollowingKey });
        }

        // 3. 모달 리스트 데이터 갱신을 위해 무효화 처리를 수행
        queryClient.invalidateQueries({ queryKey: queryKeys.follows.all });
        return res;
      } catch (e) {
        console.error("Toggle Follow Error:", e);
        toast.error("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return {
          success: false,
          error: "요청에 실패했습니다. 잠시 후 다시 시도해주세요.",
        };
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
