/**
 * File Name : features/stream/components/StreamChatActionMenuItems.tsx
 * Description : 스트림 채팅 메시지 액션 메뉴 아이템 묶음
 * Author : 임도헌
 *
 * History
 * 2026.04.21  임도헌   Created   StreamChatRoom에서 데스크톱/모바일 공통 메시지 액션 묶음을 분리
 */
"use client";

import {
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { StreamChatMessage } from "@/features/chat/types";

interface StreamChatActionMenuItemsProps {
  message: StreamChatMessage;
  isViewerHost: boolean;
  isMine: boolean;
  className: string;
  onDelete: (messageId: number) => void;
  onCopy: (payload: string) => void;
  onReport: (messageId: number) => void;
}

/**
 * 데스크톱 포털 메뉴와 모바일 BottomSheet가 공유하는 메시지 액션 묶음.
 */
export default function StreamChatActionMenuItems({
  message,
  isViewerHost,
  isMine,
  className,
  onDelete,
  onCopy,
  onReport,
}: StreamChatActionMenuItemsProps) {
  return (
    <>
      {isViewerHost && (
        <button
          type="button"
          onClick={() => onDelete(Number(message.id))}
          className={cn(
            className,
            "text-danger hover:bg-danger/5",
            !isMine && "border-b border-border-subtle"
          )}
        >
          <TrashIcon className="size-4" />
          삭제하기
        </button>
      )}
      <button
        type="button"
        onClick={() => onCopy(message.payload)}
        className={className}
      >
        <ClipboardDocumentIcon className="size-4" />
        복사하기
      </button>
      {!isMine && (
        <button
          type="button"
          onClick={() => onReport(Number(message.id))}
          className={cn(
            className,
            "border-t border-border-subtle text-danger hover:bg-danger/5"
          )}
        >
          <ExclamationTriangleIcon className="size-4" />
          신고하기
        </button>
      )}
    </>
  );
}
