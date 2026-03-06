/**
 * File Name : features/search/hooks/useSearchHistory.ts
 * Description : 검색 기록 상태 및 API 관리 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.17  임도헌   Created   검색 기록 상태 및 API 분리 훅 생성
 * 2025.06.21  임도헌   Modified  검색 기록 서버 저장 기능 추가 (createSearchHistory)
 * 2026.01.16  임도헌   Moved     hooks -> hooks/search
 * 2026.01.18  임도헌   Moved     hooks/search -> features/search/hooks
 * 2026.01.28  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.03.01  임도헌   Modified  useState 제거 및 useQuery/useMutation을 활용한 서버 상태 동기화
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  검색 기록 낙관적 업데이트와 삭제에도 키워드 소문자 정규화 규칙을 적용
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  deleteSearchHistory,
  deleteAllSearchHistory,
  getUserSearchHistory,
  createSearchHistory,
} from "@/features/product/actions/history";
import type { SearchHistoryItem } from "@/features/product/types";

/**
 * 검색어를 서버 저장 기준과 동일하게 정규화
 * - 앞뒤 공백 제거
 * - 소문자 통일
 */
const normalizeKeyword = (keyword: string) => keyword.trim().toLowerCase();

/**
 * 검색 기록 관리 훅
 *
 * [상태 주입 및 사이드 이펙트 제어 로직]
 * - `useQuery`를 활용한 검색 기록 서버 데이터 캐싱 및 전역 상태 관리 적용
 * - 신규 검색어 추가(`addHistory`) 시 `onMutate` 단계를 활용하여 로컬 캐시에 즉시 반영 및 중복 제거(Optimistic Update)
 * - 추가 실패 시 `onError`를 통한 이전 캐시 스냅샷 복구(Rollback) 적용
 * - 삭제(`removeHistory`) 및 전체 삭제(`clearHistory`) 완료 후 `queryClient.setQueryData` 및 무효화 처리를 통한 서버 상태 동기화
 */
export function useSearchHistory(initialHistory: SearchHistoryItem[] = []) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.search.history();

  const { data: history } = useQuery({
    queryKey,
    queryFn: async () => await getUserSearchHistory(), // 서버 액션 내부에서 세션 검증
    initialData: initialHistory,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: addHistory } = useMutation({
    mutationFn: async (keyword: string) => await createSearchHistory(keyword),
    onMutate: async (keyword) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SearchHistoryItem[]>(queryKey);

      queryClient.setQueryData(queryKey, (old: SearchHistoryItem[] = []) => {
        const normalized = normalizeKeyword(keyword);
        const filtered = old.filter((item) => item.keyword !== normalized);
        return [
          { keyword: normalized, created_at: new Date() },
          ...filtered,
        ].slice(0, 5);
      });

      return { previous };
    },
    onError: (err, newKeyword, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const { mutate: removeHistory } = useMutation({
    mutationFn: async (keyword: string) =>
      await deleteSearchHistory(normalizeKeyword(keyword)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const { mutate: clearHistory } = useMutation({
    mutationFn: async () => await deleteAllSearchHistory(),
    onSuccess: () => queryClient.setQueryData(queryKey, []),
  });

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
  };
}
