/**
 * File Name : features/stream/components/StreamChatMessageItem.tsx
 * Description : 스트림 채팅 개별 메시지 렌더 컴포넌트
 * Author : 임도헌
 *
 * History
 * 2026.04.21  임도헌   Created   StreamChatRoom에서 개별 메시지 렌더와 옵션 버튼 분기를 분리
 * 2026.05.28  임도헌   Modified  모바일 입력 집중 모드 메시지 렌더와 내/상대 좌우 정렬 기준 추가
 * 2026.05.29  임도헌   Modified  max-lg 롱프레스 메뉴와 텍스트 선택 충돌 방지 기준 정리
 */

import TimeAgo from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import type { StreamChatMessage } from "@/features/chat/types";

interface StreamChatMessageItemProps {
  message: StreamChatMessage;
  currentUserId: number;
  currentUsername: string;
  hostUserId: number;
  activeMenuMessageId: number | null;
  onSelectUser: (user: {
    id: number;
    username: string;
    avatar: string | null;
  }) => void;
  onLongPressStart: (
    event: React.PointerEvent<HTMLDivElement>,
    message: StreamChatMessage
  ) => void;
  onLongPressMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onLongPressEnd: () => void;
  onOptionButtonClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    message: StreamChatMessage,
    isMine: boolean
  ) => void;
  isFocusMode?: boolean;
  useLongPressMenu?: boolean;
}

/**
 * 스트림 채팅 단일 메시지 아이템
 *
 * 메시지 정렬, 호스트 배지, 옵션 버튼, 모바일 롱프레스 진입점을 한 덩어리로 캡슐화
 */
export default function StreamChatMessageItem({
  message,
  currentUserId,
  currentUsername,
  hostUserId,
  activeMenuMessageId,
  onSelectUser,
  onLongPressStart,
  onLongPressMove,
  onLongPressEnd,
  onOptionButtonClick,
  isFocusMode = false,
  useLongPressMenu = false,
}: StreamChatMessageItemProps) {
  const normalizedMessageUserId = Number(message.userId);
  const safeMessageUserId = Number.isFinite(normalizedMessageUserId)
    ? normalizedMessageUserId
    : 0;
  const isMine = safeMessageUserId === currentUserId;
  const isHost = safeMessageUserId === hostUserId;
  const isDeleted = !!message.deleted_at;
  const username =
    message.user?.username ?? (isMine ? currentUsername : "선원");

  if (isFocusMode) {
    return (
      <div
        className={cn(
          "group flex w-full text-sm leading-6",
          isMine ? "justify-end" : "justify-start",
          useLongPressMenu &&
            "select-none touch-manipulation [-webkit-touch-callout:none]"
        )}
        onPointerDown={(event) => onLongPressStart(event, message)}
        onContextMenu={(event) => {
          if (useLongPressMenu || isDeleted) {
            event.preventDefault();
          }
        }}
        onPointerUp={onLongPressEnd}
        onPointerLeave={onLongPressEnd}
        onPointerCancel={onLongPressEnd}
        onPointerMove={onLongPressMove}
      >
        <div
          className={cn(
            "flex max-w-[88%] items-end gap-2",
            isMine ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-col",
              isMine ? "items-end" : "items-start"
            )}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectUser({
                  id: safeMessageUserId,
                  username,
                  avatar: message.user?.avatar ?? null,
                });
              }}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={`${username} 사용자 메뉴 열기`}
              className={cn(
                "focus-ring-soft mb-0.5 inline-flex max-w-[9rem] items-center gap-1 rounded px-1 text-xs font-semibold transition-colors hover:bg-surface-dim",
                isMine
                  ? "-mr-1 text-brand dark:text-brand-light"
                  : "-ml-1 text-muted",
                isHost && "text-accent-dark"
              )}
            >
              <span className="truncate">{username}</span>
              {isHost && (
                <span className="rounded bg-accent/20 px-1 py-0.5 text-xs font-bold leading-none text-accent-dark">
                  HOST
                </span>
              )}
            </button>
            <div
              className={cn(
                "max-w-full break-words whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                isMine
                  ? "rounded-br-none bg-brand text-white"
                  : "rounded-bl-none bg-surface-dim text-primary"
              )}
            >
              {isDeleted ? (
                <span
                  className={cn("italic", isMine ? "text-white/85" : "text-muted")}
                >
                  호스트에 의해 삭제된 메시지입니다.
                </span>
              ) : (
                message.payload
              )}
            </div>
          </div>
          <TimeAgo
            date={message.created_at.toString()}
            className="mb-1 shrink-0 whitespace-nowrap text-xs font-medium text-muted"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex w-full",
        isMine ? "justify-end" : "justify-start",
        useLongPressMenu &&
          "select-none touch-manipulation [-webkit-touch-callout:none]"
      )}
      // 모바일의 메시지 길게 누르기 시점 한정 액션 시트 열기, 일반 탭과 액션 진입 분리
      onPointerDown={(event) => onLongPressStart(event, message)}
      onContextMenu={(event) => {
        if (useLongPressMenu || isDeleted) {
          event.preventDefault();
        }
      }}
      onPointerUp={onLongPressEnd}
      onPointerLeave={onLongPressEnd}
      onPointerCancel={onLongPressEnd}
      onPointerMove={onLongPressMove}
    >
      <div
        className={cn(
          "relative flex max-w-[88%] items-end gap-2",
          isMine ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col",
            isMine ? "items-end" : "items-start"
          )}
        >
          {/* 닉네임 버튼의 프로필/관리 모달 진입점 역할에 맞춘 말풍선 분리 및 작은 타깃 유지 */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelectUser({
                id: safeMessageUserId,
                username,
                avatar: message.user?.avatar ?? null,
              });
            }}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={`${username} 사용자 메뉴 열기`}
            className={cn(
              "focus-ring-soft mb-1 inline-flex items-center gap-1.5 rounded px-1 transition-colors hover:bg-surface-dim",
              isMine ? "-mr-1" : "-ml-1"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium",
                isMine ? "text-brand dark:text-brand-light" : "text-muted",
                isHost && "text-accent-dark"
              )}
            >
              {username}
            </span>
            {isHost && (
              <span className="rounded bg-accent/20 px-1 py-0.5 text-xs font-bold leading-none text-accent-dark">
                HOST
              </span>
            )}
          </button>

          <div
            className={cn(
              "max-w-full break-words whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
              isMine
                ? "rounded-br-none bg-brand text-white ring-1 ring-black/5 dark:ring-white/10"
                : "rounded-bl-none border border-border-subtle bg-surface-dim text-primary"
            )}
          >
            {isDeleted ? (
              <span
                className={cn(
                  "italic leading-relaxed",
                  isMine ? "text-white/85" : "text-muted"
                )}
              >
                호스트에 의해 삭제된 메시지입니다.
              </span>
            ) : (
              message.payload
            )}
          </div>
        </div>

        <div className="mb-1 shrink-0 text-xs font-medium text-muted">
          <TimeAgo
            date={message.created_at.toString()}
            className="whitespace-nowrap"
          />
        </div>

        {!isDeleted && (
          <button
            type="button"
            onClick={(event) => onOptionButtonClick(event, message, isMine)}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="메시지 옵션"
            aria-expanded={activeMenuMessageId === Number(message.id)}
            aria-haspopup="menu"
            className={cn(
              "focus-ring-soft absolute top-7 hidden min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-muted/60 transition-colors hover:bg-surface-dim hover:text-primary lg:inline-flex",
              isMine ? "-left-10" : "-right-10",
              "lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100",
              activeMenuMessageId === Number(message.id) &&
                "pointer-events-auto bg-surface-dim text-primary opacity-100"
            )}
            title="메시지 옵션"
          >
            <EllipsisVerticalIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
