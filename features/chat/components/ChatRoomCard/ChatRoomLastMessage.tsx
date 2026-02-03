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
 */
"use client";

import { ChatMessage } from "@/features/chat/types";
import { cn } from "@/lib/utils";

interface ChatRoomLastMessageProps {
  message?: ChatMessage;
}

/**
 * 마지막 대화 내용 표시 (없으면 안내 문구)
 */
export default function ChatRoomLastMessage({
  message,
}: ChatRoomLastMessageProps) {
  return (
    <p
      className={cn(
        "text-sm truncate max-w-[200px] sm:max-w-[260px]",
        message ? "text-muted" : "text-muted/60 italic"
      )}
    >
      {message?.payload || "대화를 시작해보세요"}
    </p>
  );
}
