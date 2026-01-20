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
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteSearchHistory,
  deleteAllSearchHistory,
  getUserSearchHistory,
  createSearchHistory,
} from "@/app/(tabs)/products/actions/history";

/**
 * 검색 기록 아이템 타입 정의
 */
export interface SearchHistoryItem {
  keyword: string;
  created_at: Date;
}

/**
 * useSearchHistory
 *
 * 제품 검색 기록 상태를 관리하고 서버와 동기화하는 커스텀 훅
 *
 * 주요 기능:
 * - 검색 기록 목록 저장 및 UI용 상태 관리
 * - 검색 기록 추가 (중복 제거 및 상위 5개 유지)
 * - 개별 기록 삭제, 전체 삭제 (서버 API 포함)
 *
 * @param initialHistory - 초기 검색 기록 목록 (SSR or CSR로 주입)
 */
export function useSearchHistory(initialHistory: SearchHistoryItem[] = []) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  /**
   * 검색 기록에 새로운 키워드를 추가하고 서버에도 저장
   * 중복 제거 후 최신순 5개까지 유지
   * @param keyword - 검색어
   */
  const addHistory = useCallback(
    async (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;

      const newItem: SearchHistoryItem = {
        keyword: trimmed,
        created_at: new Date(),
      };

      const filtered = history.filter((item) => item.keyword !== trimmed);
      const updated = [newItem, ...filtered].slice(0, 5);
      setHistory(updated);

      try {
        await createSearchHistory(trimmed); // 서버 저장 호출
      } catch (err) {
        console.error("검색 기록 저장 실패", err);
      }
    },
    [history]
  );

  /**
   * 개별 검색 기록을 삭제하고 서버에서 동기화
   * @param keyword - 삭제할 검색어
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
   * 서버에서도 일괄 삭제
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
