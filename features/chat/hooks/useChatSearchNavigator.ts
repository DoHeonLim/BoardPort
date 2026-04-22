/**
 * File Name : features/chat/hooks/useChatSearchNavigator.ts
 * Description : 채팅방 내부 검색 훅 (매치 계산 + 이전/다음 이동 + 상태 피드백)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ChatMessagesList의 검색 매치 계산, 순환 이동, 결과 상태 피드백을 훅으로 분리
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "@/features/chat/types";

type SearchHighlightTone = "active" | "hit" | null;

interface SearchMeta {
  count: number;
  current: number;
  canGoPrev: boolean;
  canGoNext: boolean;
}

interface UseChatSearchNavigatorOptions {
  messages: ChatMessage[];
  searchQuery?: string;
  searchNavigation?: { seq: number; direction: "next" | "prev" } | null;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => Promise<void> | void;
  onSearchMetaChange?: (meta: SearchMeta) => void;
  scrollToMessageById: (messageId: number, behavior?: ScrollBehavior) => void;
  isMobile: boolean;
  isKeyboardOpen: boolean;
}

/**
 * 채팅방 메시지 검색 상태를 관리하는 훅
 *
 * [역할]
 * - 검색어 기준 매치 메시지 목록을 계산하고 최신 결과부터 순환 탐색
 * - 결과가 없을 때 과거 메시지를 순차 로드하도록 상위 훅(loadMore)과 연결
 * - 헤더와 모바일 플로팅 내비게이터가 공통 메타(count/current)를 재사용할 수 있게 함
 */
export default function useChatSearchNavigator({
  messages,
  searchQuery = "",
  searchNavigation = null,
  hasMore,
  isFetchingNextPage,
  loadMore,
  onSearchMetaChange,
  scrollToMessageById,
  isMobile,
  isKeyboardOpen,
}: UseChatSearchNavigatorOptions) {
  const [searchMatchIds, setSearchMatchIds] = useState<number[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number>(-1);

  const trimmedSearchQuery = searchQuery.trim();
  const isSearchMode = trimmedSearchQuery.length > 0;

  const showSearchPendingNotice =
    isSearchMode &&
    searchMatchIds.length === 0 &&
    (isFetchingNextPage || hasMore);
  const showSearchEmptyNotice =
    isSearchMode &&
    searchMatchIds.length === 0 &&
    !isFetchingNextPage &&
    !hasMore;
  const showMobileSearchNavigator =
    isMobile && isSearchMode && searchMatchIds.length > 0 && !isKeyboardOpen;

  const searchMatchIdSet = useMemo(
    () => new Set(searchMatchIds),
    [searchMatchIds]
  );

  const emitSearchMeta = useCallback(
    (count: number, activeIndex: number) => {
      onSearchMetaChange?.({
        count,
        current: count === 0 || activeIndex < 0 ? 0 : activeIndex + 1,
        canGoPrev: count > 1,
        canGoNext: count > 1,
      });
    },
    [onSearchMetaChange]
  );

  const navigateSearch = useCallback(
    (direction: "next" | "prev") => {
      if (searchMatchIds.length === 0) return;

      setActiveSearchIndex((prev) => {
        const baseIndex = prev >= 0 ? prev : 0;
        const nextIndex =
          direction === "prev"
            ? (baseIndex + 1) % searchMatchIds.length
            : (baseIndex - 1 + searchMatchIds.length) % searchMatchIds.length;

        emitSearchMeta(searchMatchIds.length, nextIndex);

        requestAnimationFrame(() => {
          scrollToMessageById(searchMatchIds[nextIndex]);
        });

        return nextIndex;
      });
    },
    [emitSearchMeta, scrollToMessageById, searchMatchIds]
  );

  /**
   * 현재 검색어 기준 매치 목록 계산
   * - 최신 메시지부터 순환 탐색하도록 reverse()된 ID 배열을 유지
   * - 결과가 아직 없고 더 불러올 과거 페이지가 있으면 loadMore를 이어서 호출
   */
  useEffect(() => {
    const normalizedQuery = trimmedSearchQuery.toLowerCase();

    if (!normalizedQuery) {
      setSearchMatchIds([]);
      setActiveSearchIndex(-1);
      emitSearchMeta(0, -1);
      return;
    }

    const matches = messages
      .filter(
        (message) =>
          typeof message.payload === "string" &&
          message.payload.toLowerCase().includes(normalizedQuery)
      )
      .map((message) => message.id)
      .reverse();

    setSearchMatchIds(matches);

    if (matches.length === 0) {
      setActiveSearchIndex(-1);
      emitSearchMeta(0, -1);

      if (hasMore && !isFetchingNextPage) {
        void loadMore();
      }

      return;
    }

    setActiveSearchIndex(0);
    emitSearchMeta(matches.length, 0);

    requestAnimationFrame(() => {
      scrollToMessageById(matches[0]);
    });
  }, [
    emitSearchMeta,
    hasMore,
    isFetchingNextPage,
    loadMore,
    messages,
    scrollToMessageById,
    trimmedSearchQuery,
  ]);

  /**
   * 헤더의 이전/다음 검색 이동 요청 처리
   * - 매치 배열을 순환하며 활성 인덱스를 갱신하고 해당 메시지로 스크롤
   */
  useEffect(() => {
    if (!searchNavigation || searchMatchIds.length === 0) return;
    navigateSearch(searchNavigation.direction);
  }, [navigateSearch, searchMatchIds.length, searchNavigation]);

  /**
   * 현재 메시지의 검색 강조 톤 계산
   * - active 결과와 일반 매치를 시각적으로 구분해 이전/다음 이동 위치를 명확히 보여준다.
   */
  const getSearchHighlightToneForMessage = useCallback(
    (messageId: number): SearchHighlightTone => {
      const isActive =
        activeSearchIndex >= 0 &&
        searchMatchIds[activeSearchIndex] === messageId;

      if (isActive) {
        return "active";
      }

      if (searchMatchIdSet.has(messageId)) {
        return "hit";
      }

      return null;
    },
    [activeSearchIndex, searchMatchIds, searchMatchIdSet]
  );

  return {
    activeSearchIndex,
    searchMatchIds,
    trimmedSearchQuery,
    isSearchMode,
    showSearchPendingNotice,
    showSearchEmptyNotice,
    showMobileSearchNavigator,
    navigateSearch,
    getSearchHighlightToneForMessage,
  };
}
