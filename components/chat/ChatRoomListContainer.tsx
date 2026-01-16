/**
 * File Name : components/chat/ChatRoomListContainer
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
 */

"use client";

import useChatRoomSubscription from "@/hooks/chat/useChatRoomSubscription";
import ChatRoomCard from "./ChatRoomCard";
import type { ChatRoom } from "@/types/chat";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/outline";

export default function ChatRoomListContainer({
  initialRooms,
  userId,
}: {
  initialRooms: ChatRoom[];
  userId: number;
}) {
  const { rooms, unreadCounts } = useChatRoomSubscription(userId, initialRooms);

  return (
    <div className="flex flex-col gap-3 px-page-x py-6 w-full max-w-mobile mx-auto">
      <h1 className="text-xl font-bold text-primary mb-2 px-1">
        신호{" "}
        <span className="text-brand dark:text-brand-light ml-1">
          {rooms.length}
        </span>
      </h1>

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
          <p className="text-sm text-muted mt-1">
            관심 있는 물품에 대해 대화를 시작해보세요!
          </p>
        </div>
      )}
    </div>
  );
}
