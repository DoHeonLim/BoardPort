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
 * 2026.04.17  임도헌   Modified   팔로우 무한스크롤 훅의 캐시 분리/에러 stage 반환 책임 설명 보강
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
 * [기능]
 * - `username`과 `type`(followers/following)을 함께 queryKey에 반영해 모달별 캐시를 분리
 * - `enabled`가 켜진 시점에만 `useInfiniteQuery`를 활성화해 팔로우 모달을 지연 로딩
 * - 서버 fetcher가 돌려준 `nextCursor`를 그대로 다음 페이지 커서로 이어 붙임
 * - 데이터가 전혀 없는 상태의 실패는 `first`, 추가 로드 중 실패는 `more` stage로 나눠 상위 UI가 다른 UX를 그릴 수 있게 함
 *
 * @param {UseFollowPaginationParams} params - 유저명, 리스트 타입, 페칭 함수, 지연 로딩 트리거 플래그
 * @returns {object} 평탄화된 유저 목록, 로딩/에러 상태, loadMore 및 retry 제어값
 */
export function useFollowPagination({
  username,
  type,
  fetcher,
  enabled,
}: UseFollowPaginationParams) {
  // 모달별/유저별 고유 캐시 키 구성
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
      // 서버 액션 기반 팔로우 목록 패칭
      return await fetcher(username, pageParam as FollowListCursor);
    },
    initialPageParam: null as FollowListCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled, // 모달이 닫혀있으면 쿼리를 대기 상태로 유지
    staleTime: 5 * 60 * 1000, // 변경 빈도를 고려한 5분 캐시 유지
  });

  // useInfiniteQuery 페이지 응답의 모달 리스트용 1차원 배열 정리
  const users = data?.pages.flatMap((p) => p.users) ?? [];

  // 에러 발생 시점 분기
  // 데이터 부재 상태의 에러를 초기 로딩 실패(first)로 분리
  const isFirstError = isError && users.length === 0;
  const customError = isError
    ? {
        stage: isFirstError ? ("first" as const) : ("more" as const),
        message: error?.message || "데이터를 불러오지 못했습니다.",
      }
    : null;

  return {
    users,
    // 쿼리 활성화 후 데이터 부재 상태를 초기 로딩으로 정의
    isLoading: isPending && enabled,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    error: customError,
    loadMore: fetchNextPage,
    retry: refetch, // 에러 발생 시 수동 재시도 경로 노출
  };
}
