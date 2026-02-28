/**
 * File Name : features/chat/components/chatRoomCard/ChatRoomLastMessage.tsx
 * Description : 채팅방 마지막 메시지 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   마지막 메시지 컴포넌트 분리
 * 2025.07.24  임도헌   Modified  BoardPort 스타일 적용
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (text-muted)
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  텍스트 너비를 w-full로 수정
 */
"use client";

import { ChatMessage } from "@/features/chat/types";
import { PhotoIcon } from "@heroicons/react/24/outline";

interface ChatRoomLastMessageProps {
  message?: ChatMessage;
}

/**
 * 마지막 대화 내용 표시
 * - 텍스트가 있으면 텍스트 표시
 * - 텍스트가 없고 이미지만 있으면 '사진' 아이콘과 텍스트 표시
 */
export default function ChatRoomLastMessage({
  message,
}: ChatRoomLastMessageProps) {
  if (!message) {
    return <p className="text-sm text-muted/60 italic">대화를 시작해보세요</p>;
  }

  // 텍스트가 있는 경우
  if (message.payload) {
    return (
      <p className="text-sm text-muted truncate w-full">{message.payload}</p>
    );
  }

  // 텍스트 없이 이미지만 있는 경우
  if (message.image) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted">
        <PhotoIcon className="size-4" />
        <span>사진</span>
      </div>
    );
  }

  return <p className="text-sm text-muted/60 italic">내용 없음</p>;
}
