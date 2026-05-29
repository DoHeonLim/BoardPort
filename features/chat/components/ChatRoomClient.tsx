/**
 * File Name : features/chat/components/ChatRoomClient.tsx
 * Description : 채팅방 상세의 헤더 검색 상태와 메시지 리스트를 연결하는 클라이언트 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.12  임도헌   Created   채팅방 검색 상태를 헤더와 메시지 리스트 사이에서 공유하는 래퍼 추가
 * 2026.03.28  임도헌   Modified  현재 대화 검색 메타에 이동 가능 방향 상태를 포함해 헤더/모바일 검색 내비게이션과 동기화
 * 2026.04.02  임도헌   Modified  채팅 헤더 공용 제품 요약 타입을 재사용하도록 정리
 * 2026.05.28  임도헌   Modified  모바일 visualViewport 높이 CSS 변수 동기화 추가
 */
"use client";

import { useState } from "react";
import ChatHeader from "@/features/chat/components/ChatHeader";
import ChatMessagesList from "@/features/chat/components/ChatMessagesList";
import useVisualViewportHeightCssVar from "@/hooks/useVisualViewportHeightCssVar";
import type { ChatHeaderProduct, ChatUser } from "@/features/chat/types";

interface ChatRoomClientProps {
  chatRoomId: string;
  viewerId: number;
  counterparty: ChatUser;
  product: ChatHeaderProduct;
  viewer: ChatUser;
  isCounterpartyLeft?: boolean;
  returnTo: string;
}

type SearchDirection = "next" | "prev";

/**
 * 채팅방 상세 클라이언트 조합 컴포넌트
 *
 * [역할]
 * - 헤더 검색 UI 상태(searchOpen, searchQuery)를 단일 위치에서 관리
 * - 헤더의 이전/다음 검색 이동 요청을 메시지 리스트로 전달
 * - 메시지 리스트가 계산한 검색 결과 개수/현재 위치를 헤더에 다시 반영
 */
export default function ChatRoomClient({
  chatRoomId,
  viewerId,
  counterparty,
  product,
  viewer,
  isCounterpartyLeft = false,
  returnTo,
}: ChatRoomClientProps) {
  useVisualViewportHeightCssVar("--chat-visual-viewport-height");

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMeta, setSearchMeta] = useState({
    count: 0,
    current: 0,
    canGoPrev: false,
    canGoNext: false,
  });
  const [searchNav, setSearchNav] = useState<{
    seq: number;
    direction: SearchDirection;
  } | null>(null);

  /**
   * 검색 결과 이동 요청을 증가하는 시퀀스로 발행
   * - 같은 방향 버튼을 연속 클릭해도 메시지 리스트 측 effect가 다시 반응하도록 seq를 증가시킨다.
   */
  const triggerSearchMove = (direction: SearchDirection) => {
    setSearchNav((prev) => ({
      seq: (prev?.seq ?? 0) + 1,
      direction,
    }));
  };

  /**
   * 검색 모드 종료 및 관련 상태 초기화
   */
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchMeta({
      count: 0,
      current: 0,
      canGoPrev: false,
      canGoNext: false,
    });
    setSearchNav(null);
  };

  return (
    <>
      <ChatHeader
        chatRoomId={chatRoomId}
        viewerId={viewerId}
        counterparty={counterparty}
        product={product}
        returnTo={returnTo}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        searchResultCount={searchMeta.count}
        searchCurrentIndex={searchMeta.current}
        searchCanGoPrev={searchMeta.canGoPrev}
        searchCanGoNext={searchMeta.canGoNext}
        onSearchOpen={() => setSearchOpen(true)}
        onSearchClose={closeSearch}
        onSearchChange={setSearchQuery}
        onSearchNext={() => triggerSearchMove("next")}
        onSearchPrev={() => triggerSearchMove("prev")}
      />
      <ChatMessagesList
        productChatRoomId={chatRoomId}
        user={viewer}
        isCounterpartyLeft={isCounterpartyLeft}
        searchQuery={searchQuery}
        searchNavigation={searchNav}
        onSearchMetaChange={setSearchMeta}
      />
    </>
  );
}
