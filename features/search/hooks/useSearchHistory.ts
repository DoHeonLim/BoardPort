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
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteSearchHistory,
  deleteAllSearchHistory,
  getUserSearchHistory,
  createSearchHistory,
} from "@/features/product/actions/history";
import type { SearchHistoryItem } from "@/features/product/types";

/**
 * 검색 기록 관리 훅
 *
 * [기능]
 * 1. 초기 검색 기록(SSR/Props)을 상태로 관리
 * 2. 검색어 추가 시 중복 제거 후 최신순으로 정렬하고 서버에 저장
 * 3. 개별 삭제 및 전체 삭제 기능을 제공하며 서버와 동기화
 *
 * @param {SearchHistoryItem[]} initialHistory - 초기 검색 기록 목록
 */
export function useSearchHistory(initialHistory: SearchHistoryItem[] = []) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 초기값 동기화
  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  /**
   * 검색 기록 추가
   * - 중복된 키워드가 있으면 제거하고 맨 앞에 추가. (LRU 방식)
   * - 최대 5개까지만 유지
   * - 비동기로 서버 저장 액션을 호출. (Fire & Forget)
   */
  const addHistory = useCallback(
    async (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;

      const newItem: SearchHistoryItem = {
        keyword: trimmed,
        created_at: new Date(),
      };

      // 로컬 상태 즉시 업데이트 (Optimistic)
      const filtered = history.filter((item) => item.keyword !== trimmed);
      const updated = [newItem, ...filtered].slice(0, 5);
      setHistory(updated);

      try {
        await createSearchHistory(trimmed); // 서버 저장
      } catch (err) {
        console.error("검색 기록 저장 실패", err);
        // 실패 시 롤백 처리는 생략 (검색 기록은 중요도가 낮음)
      }
    },
    [history]
  );

  /**
   * 개별 검색 기록 삭제
   * - 서버 삭제 액션 호출 후, 최신 목록을 다시 불러와 상태를 갱신
   */
  const removeHistory = useCallback(async (keyword: string) => {
    try {
      await deleteSearchHistory(keyword);
      const updated = await getUserSearchHistory();
      setHistory(updated);
    } catch (err) {
      console.error("검색 기록 삭제 실패", err);
    }
  }, []);

  /**
   * 전체 검색 기록 삭제
   * - 서버 전체 삭제 액션 호출 후 로컬 상태를 비움
   */
  const clearHistory = useCallback(async () => {
    try {
      await deleteAllSearchHistory();
      setHistory([]);
    } catch (err) {
      console.error("전체 검색 기록 삭제 실패", err);
    }
  }, []);

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
  };
}
