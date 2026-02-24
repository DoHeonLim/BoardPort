/**
 * File Name : features/chat/components/ChatRoomCard/index.tsx
 * Description : 채팅방 카드 메인 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.15  임도헌   Created
 * 2024.11.15  임도헌   Modified  채팅방 리스트 컴포넌트 추가
 * 2024.11.21  임도헌   Modified  ChatroomId를 productChatRoomId으로 변경
 * 2024.12.07  임도헌   Modified  채팅방 리스트 스타일 변경
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.12  임도헌   Modified  채팅방 생성 시간 표시 변경
 * 2024.12.22  임도헌   Modified  채팅방 안 읽은 메시지 실시간 갱신
 * 2024.12.23  임도헌   Modified  채팅방 갱신 코드 chat-room-list-container.tsx로 이동
 * 2025.05.10  임도헌   Modified  UI 개선
 * 2025.07.15  임도헌   Modified  ChatRoomList컴포넌트에서 채팅방 카드 컴포넌트로 변경
 * 2025.07.16  임도헌   Modified  기능별 컴포넌트 분리
 * 2025.07.24  임도헌   Modified  BoardPort 스타일 완전 적용
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (bg-surface, border-border)
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * ===============================================================================================
 * ChatRoomCard (채팅방 목록 아이템)를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 *
 * - ChatRoomThumbnail.tsx     : 제품 썸네일 이미지
 * - ChatRoomHeader.tsx        : 상대방 유저 이름 및 아바타
 * - ChatRoomLastMessage.tsx   : 마지막 대화 내용 (Truncated)
 * - ChatRoomUnreadBadge.tsx   : 읽지 않은 메시지 수 뱃지 및 시간
 * - index.tsx                 : 위 컴포넌트들을 조합한 최종 카드
 * ===============================================================================================
 */

"use client";

import Link from "next/link";
import ChatRoomThumbnail from "@/features/chat/components/ChatRoomCard/ChatRoomThumbnail";
import ChatRoomHeader from "@/features/chat/components/ChatRoomCard/ChatRoomHeader";
import ChatRoomLastMessage from "@/features/chat/components/ChatRoomCard/ChatRoomLastMessage";
import ChatRoomUnreadBadge from "@/features/chat/components/ChatRoomCard/ChatRoomUnreadBadge";
import { ChatRoom } from "@/features/chat/types";
import { cn } from "@/lib/utils";

interface ChatRoomCardProps {
  room: ChatRoom;
  unreadCount: number;
}

/**
 * 채팅방 목록 아이템 카드
 */
export default function ChatRoomCard({ room, unreadCount }: ChatRoomCardProps) {
  return (
    <Link
      href={`/chats/${room.id}`}
      className={cn(
        "group w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
        "bg-surface border border-border shadow-sm",
        "hover:shadow-md hover:border-brand/30 dark:hover:border-brand-light/30 active:scale-[0.99]"
      )}
    >
      {/* 썸네일 */}
      <ChatRoomThumbnail product={room.product} />

      {/* 유저 + 메시지 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex justify-between items-start">
          <ChatRoomHeader user={room.users[0]} />
          <ChatRoomUnreadBadge
            count={unreadCount}
            date={room.lastMessage?.created_at?.toString() ?? ""}
          />
        </div>
        <ChatRoomLastMessage message={room.lastMessage ?? undefined} />
      </div>
    </Link>
  );
}
