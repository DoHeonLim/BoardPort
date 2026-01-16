/**
 * File Name : components/chat/chatRoomCard/ChatRoomUnreadBadge
 * Description : 채팅방 안 읽은 메시지 뱃지 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   읽지 않은 메시지 뱃지 분리
 * 2025.07.17  임도헌   Modified  시간과 뱃지 따로 처리
 * 2025.12.02  임도헌   Modified  메세지 없을 시 null 처리
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (bg-danger, text-muted)
 */
"use client";

import TimeAgo from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";

interface ChatRoomUnreadBadgeProps {
  count: number;
  date: string;
}

export default function ChatRoomUnreadBadge({
  count,
  date,
}: ChatRoomUnreadBadgeProps) {
  if (!date) return null;

  return (
    <div className="flex flex-col items-end gap-1 min-w-[60px]">
      <span className="text-[11px] text-muted whitespace-nowrap">
        <TimeAgo date={date} />
      </span>

      {count > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5",
            "text-[10px] font-bold text-white rounded-full shadow-sm",
            "bg-danger" // 중요 알림은 빨간색 유지
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}
