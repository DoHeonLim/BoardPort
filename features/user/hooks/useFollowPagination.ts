/**
 * File Name : features/user/hooks/useFollowPagination.ts
 * Description : 팔로워/팔로잉 공용 페이지네이션 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.12  임도헌   Created    followers/following 공용화 + 키셋 커서 + 중복 제거
 * 2025.10.29  임도헌   Modified   loadFirst/loadMore try-finally 도입, 실패 시 상태 복구 보강
 * 2025.11.22  임도헌   Modified   onSeedOrMerge 옵션 제거(viewerFollowingSet 의존성 완전 제거)
 * 2025.12.20  임도헌   Modified   upsertLocal 신규 유저는 append(정렬/스크롤 안정성 우선)
 * 2025.12.23  임도헌   Modified   error 상태 추가(초기 로딩 실패 UX 개선) + 재시도 지원
 * 2025.12.23  임도헌   Modified   error stage(first/more) 구분 + retry() 제공(무한스크롤 루프 방지)
 * 2026.01.16  임도헌   Moved      hooks -> hooks/user
 * 2026.01.18  임도헌   Moved      hooks/user -> features/user/hooks
 * 2026.03.01  임도헌   Modified   useInfiniteQuery 도입, 수동 상태(useState) 및 병합 로직 제거
 * 2026.03.05  임도헌   Modified   주석 최신화
 */

"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { FollowListUser, FollowListCursor } from "@/features/user/types";

type Fetcher = (
  username: string,
  cursor: FollowListCursor
) => Promise<{ users: FollowListUser[]; nextCursor: FollowListCursor }>;

interface UseFollowPaginationParams {
  username: string;
  type: "followers" | "following"; // 캐시 식별자(Query Key) 분리용
  fetcher: Fetcher;
  enabled: boolean; // 모달 오픈 여부 (지연 로딩 트리거)
}

/**
 * 팔로워 및 팔로잉 목록 공용 무한 스크롤 페이징 훅
 *
 * [상태 추출 및 데이터 페칭 로직]
 * - `type`(followers/following) 식별자가 포함된 쿼리 키를 통한 캐시 상태 독립적 보존
 * - `useInfiniteQuery`를 활용한 커서 기반 데이터 페칭 및 `enabled` 옵션 기반의 지연 로딩(Lazy Load) 적용
 * - 초기 데이터가 없는 상태에서의 에러(first)와 스크롤 중 발생한 에러(more) 분기 처리를 통한 UX 최적화
 *
 * @param {UseFollowPaginationParams} params - 유저명, 리스트 타입, 페칭 함수, 지연 로딩 트리거 플래그
 */
export function useFollowPagination({
  username,
  type,
  fetcher,
  enabled,
}: UseFollowPaginationParams) {
  // 모달별, 유저별로 완벽히 분리되는 고유 캐시 키 구성
  const queryKey = queryKeys.follows.list(username, type);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      // 서버 액션을 호출하여 팔로우 유저 데이터를 패칭함.
      return await fetcher(username, pageParam as FollowListCursor);
    },
    initialPageParam: null as FollowListCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled, // 모달이 닫혀있으면 쿼리를 대기 상태로 유지함.
    staleTime: 5 * 60 * 1000, // 팔로우 목록은 변경 빈도를 고려하여 5분간 캐시를 유지함.
  });

  const users = data?.pages.flatMap((p) => p.users) ?? [];

  // 에러 발생 시점 분기 처리
  // 데이터가 하나도 없는 상태에서 발생한 에러는 초기 로딩 실패(first)로 간주함.
  const isFirstError = isError && users.length === 0;
  const customError = isError
    ? {
        stage: isFirstError ? ("first" as const) : ("more" as const),
        message: error?.message || "데이터를 불러오지 못했습니다.",
      }
    : null;

  return {
    users,
    // 쿼리가 활성화되었으나 아직 캐시에 데이터가 없는 상태를 초기 로딩으로 정의함.
    isLoading: isPending && enabled,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    error: customError,
    loadMore: fetchNextPage,
    retry: refetch, // 에러 발생 시 수동 재시도를 지원하기 위해 쿼리 리패치 함수를 노출함.
  };
}
