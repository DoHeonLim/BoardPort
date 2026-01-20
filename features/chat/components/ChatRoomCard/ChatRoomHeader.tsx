/**
 * File Name : features/chat/components/chatRoomCard/ChatRoomHeader.tsx
 * Description : 채팅방 상대 유저 정보 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   유저 정보 컴포넌트 분리
 * 2025.07.24  임도헌   Modified  BoardPort 스타일 적용
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 */
"use client";

import UserAvatar from "@/components/global/UserAvatar";
import { ChatUser } from "@/types/chat";

interface ChatRoomHeaderProps {
  user: ChatUser;
}

export default function ChatRoomHeader({ user }: ChatRoomHeaderProps) {
  return (
    <div className="flex items-center">
      <UserAvatar
        avatar={user.avatar}
        username={user.username}
        size="sm"
        showUsername={true}
        disabled={true} // 카드 전체가 링크이므로 내부 링크 비활성화
        className="p-0 hover:bg-transparent" // 카드 내부 스타일 조정
      />
    </div>
  );
}
