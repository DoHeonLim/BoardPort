/**
 * File Name : features/chat/components/ChatRoomListContainer.tsx
 * Description : 채팅방 목록 컨테이너 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.22  임도헌   Created
 * 2024.12.22  임도헌   Modified  채팅방 목록 컨테이너 컴포넌트 추가
 * 2024.12.22  임도헌   Modified  채팅방 목록 실시간 갱신
 * 2024.12.23  임도헌   Modified  채팅방 목록 실시간 갱신 오류 수정
 * 2024.12.25  임도헌   Modified  채팅방 목록 스타일 변경
 * 2025.07.16  임도헌   Modified  실시간 처리 로직 훅으로 분리
 * 2025.07.24  임도헌   Modified  리스트형 UI 리팩토링 및 스타일 개선
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 Empty State 디자인 개선
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.08  임도헌   Modified  Sticky Header 적용 및 NotificationBell 추가
 * 2026.02.23  임도헌   Modified  빈 상태 화면에 "항구로 이동하여 물품 둘러보기" 버튼을 추가
 */

"use client";

import Link from "next/link";
import useChatRoomSubscription from "@/features/chat/hooks/useChatRoomSubscription";
import ChatRoomCard from "@/features/chat/components/ChatRoomCard";
import NotificationBell from "@/components/global/NotificationBell";
import { ChatRoom } from "@/features/chat/types";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/outline";

interface ChatRoomListContainerProps {
  initialRooms: ChatRoom[];
  userId: number;
  unreadNotificationCount: number;
}
/**
 * 채팅방 목록 컨테이너
 *
 * [기능]
 * 1. `useChatRoomSubscription` 훅을 통해 실시간 업데이트(새 메시지, 읽음 상태)를 구독
 * 2. 채팅방 목록(`ChatRoomCard`)을 렌더링하며, 각 방의 안 읽은 메시지 수를 전달
 * 3. 채팅방이 없을 경우 빈 상태(Empty State)를 표시
 */
export default function ChatRoomListContainer({
  initialRooms,
  userId,
  unreadNotificationCount,
}: ChatRoomListContainerProps) {
  const { rooms, unreadCounts } = useChatRoomSubscription(userId, initialRooms);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-colors h-16">
        <div className="flex items-center justify-between px-page-x h-full max-w-mobile mx-auto">
          {/* Title & Count */}
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold text-primary">신호</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light">
              {rooms.length}
            </span>
          </div>

          {/* Notification Bell */}
          <NotificationBell
            userId={userId}
            initialCount={unreadNotificationCount}
          />
        </div>
      </header>

      {/* List Area */}
      <div className="px-page-x py-6 w-full max-w-mobile mx-auto flex-1">
        {rooms.length > 0 ? (
          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <ChatRoomCard
                key={room.id}
                room={room}
                unreadCount={unreadCounts[room.id] || 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="p-4 rounded-full bg-surface-dim mb-4">
              <ChatBubbleOvalLeftEllipsisIcon className="size-8 text-muted/50" />
            </div>
            <p className="text-lg font-medium text-primary">
              진행 중인 대화가 없습니다
            </p>
            <p className="text-sm text-muted mt-1 mb-6">
              관심 있는 물품에 대해 대화를 시작해보세요!
            </p>

            {/* 행동 유도 버튼 (CTA) */}
            <Link
              href="/products"
              className="btn-primary h-10 px-6 text-sm inline-flex items-center shadow-md"
            >
              항구로 이동하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
