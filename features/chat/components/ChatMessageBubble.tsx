/**
 * File Name : features/chat/components/ChatMessageBubble.tsx
 * Description : 채팅 메시지 말풍선
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.14  임도헌   Created   ChatMessagesList에서 분리
 * 2025.07.16  임도헌   Modified  Telegram 스타일 말풍선 및 중앙 정렬
 * 2025.07.17  임도헌   Modified  시간/읽음 여부 말풍선 바깥으로 분리
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.12  임도헌   Modified  [UI] max-width 85%로 확장, 아바타/시간 여백 미세 조정
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import { ChatUser } from "@/features/chat/types";
import { cn } from "@/lib/utils";

interface ChatMessageBubbleProps {
  message: {
    id: number;
    payload: string;
    created_at: Date | string;
    isRead: boolean;
    user: ChatUser;
  };
  isOwnMessage: boolean;
  showAvatar: boolean;
}

/**
 * 개별 메시지 말풍선
 * - 본인 메시지는 우측, 상대 메시지는 좌측 정렬
 * - 시간 및 읽음 확인(1) 표시
 */
export default function ChatMessageBubble({
  message,
  isOwnMessage,
  showAvatar,
}: ChatMessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex w-full animate-fade-in",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[85%] sm:max-w-[75%] gap-1.5",
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar (Left Only) */}
        {!isOwnMessage && (
          <div className="shrink-0 w-8 sm:w-9 flex flex-col justify-start">
            {showAvatar ? (
              <UserAvatar
                avatar={message.user.avatar}
                username={message.user.username}
                size="sm"
                showUsername={false}
                className="p-0"
              />
            ) : (
              <div className="w-8" />
            )}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col",
            isOwnMessage ? "items-end" : "items-start"
          )}
        >
          {/* Username (GroupChat only - optional, currently hidden for 1:1 context but good for structure) */}

          <div
            className={cn(
              "flex items-end gap-1.5",
              isOwnMessage ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Bubble */}
            <div
              className={cn(
                "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words shadow-sm relative",
                isOwnMessage
                  ? "bg-brand text-white rounded-br-none"
                  : "bg-surface text-primary border border-border rounded-bl-none"
              )}
            >
              {message.payload}
            </div>

            {/* Time & Read Status */}
            <div className="flex flex-col text-[10px] text-muted/80 shrink-0 mb-0.5">
              {isOwnMessage && (
                <span className="text-brand dark:text-brand-light text-right">
                  {message.isRead ? "" : "1"}
                </span>
              )}
              <TimeAgo
                date={message.created_at.toString()}
                className="whitespace-nowrap"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
