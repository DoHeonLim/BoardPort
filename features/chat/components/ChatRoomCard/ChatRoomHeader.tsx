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
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import UserAvatar from "@/components/global/UserAvatar";
import { ChatUser } from "@/features/chat/types";

interface ChatRoomHeaderProps {
  user: ChatUser;
}

/**
 * 채팅방 상대방 유저 이름 및 아바타
 */
export default function ChatRoomHeader({ user }: ChatRoomHeaderProps) {
  return (
    <div className="flex items-center">
      <UserAvatar
        avatar={user.avatar}
        username={user.username}
        size="sm"
        showUsername={true}
        disabled={true} // 카드 클릭과 충돌 방지를 위해 링크 비활성화
        className="p-0 hover:bg-transparent"
      />
    </div>
  );
}
