/**
 * File Name : features/chat/components/ChatMessageBubble.tsx
 * Description : 채팅 메시지 말풍선 및 메시지 액션 UI
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
 * 2026.02.04  임도헌   Modified  이미지 포함 메시지 렌더링 로직 추가
 * 2026.02.06  임도헌   Modified  상대방 메시지에 신고 메뉴(더보기) UI 추가
 * 2026.02.23  임도헌   Modified  다크 모드 시 본인 말풍선 가시성 개선 (bg-brand-light)
 * 2026.02.26  임도헌   Modified  메세지 오버플로우 방지
 * 2026.03.12  임도헌   Modified  이미지 확대 오버레이에 공용 bodyScrollLock 유틸 적용
 * 2026.03.12  임도헌   Modified  사용자 업로드 GIF만 조건부 최적화 예외 처리하도록 imageIsAnimated 메타 연동
 * 2026.03.12  임도헌   Modified  상대 메시지 말풍선과 메뉴 오버레이를 border-border-subtle 기준으로 정리
 * 2026.03.14  임도헌   Modified  모바일에서도 상대 메시지 신고 메뉴 버튼이 항상 보이도록 hover 의존을 제거
 * 2026.03.19  임도헌   Modified  작은 화면에서 이미지 말풍선 폭이 과도하게 커지지 않도록 썸네일 기본 크기를 한 단계 축소
 * 2026.03.27  임도헌   Modified  채팅 상세 가독성을 위해 이미지 말풍선 비중과 시간 메타 대비를 재조정
 * 2026.03.27  임도헌   Modified  이미지와 텍스트를 함께 보낼 때 캡션 구간을 분리해 답답한 밀도를 완화
 * 2026.03.28  임도헌   Modified  현재 대화 검색 하이라이트를 말풍선 표면 기준으로 지원하고, 내/상대 버블 대비를 재조정해 라이트·다크 가시성을 보강
 * 2026.03.31  임도헌   Modified  채팅 이미지 확대 오버레이를 공용 ImageZoomModal 기반으로 통일
 * 2026.04.01  임도헌   Modified  모바일 롱프레스 액션 메뉴와 본인 메시지 복사/삭제, 상대 메시지 복사/신고 메뉴 추가
 * 2026.04.02  임도헌   Modified  메시지 반응 집계 표시와 반응 토글 액션 추가
 * 2026.04.02  임도헌   Modified  데스크톱 hover 액션 바(빠른 반응 + 더보기)와 포털 메뉴 위치 계산을 적용
 * 2026.04.02  임도헌   Modified  모바일 메시지 옵션을 공용 BottomSheet로 통일하고 라이트/다크 가시성을 보강
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import BottomSheet from "@/components/global/BottomSheet";
import { ImageZoomModal } from "@/components/ui/ZoomableImage";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/features/chat/types";
import {
  CHAT_MESSAGE_REACTION_KEYS,
  CHAT_MESSAGE_REACTION_META,
  type ChatMessageReactionKey,
} from "@/features/chat/constants";
import {
  MagnifyingGlassPlusIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";

const DESKTOP_QUICK_REACTION_KEYS: ChatMessageReactionKey[] = ["LIKE", "LOVE"];

interface ChatMessageBubbleProps {
  message: ChatMessage;
  currentUserId: number;
  isOwnMessage: boolean;
  showAvatar: boolean;
  onReport?: (messageId: number) => void;
  onDelete?: (messageId: number) => void;
  onReact?: (messageId: number, reactionKey: ChatMessageReactionKey) => void;
  searchHighlight?: "active" | "hit" | null;
}

/**
 * 개별 메시지 말풍선
 *
 * [기능]
 * - 본인 메시지는 우측, 상대 메시지는 좌측 정렬
 * - 이미지 클릭 시 게시글/캐러셀과 같은 공용 확대/축소 모달 진입
 * - 모바일은 롱프레스 BottomSheet, 데스크톱은 hover 액션 바로 복사/삭제/신고/반응 제공
 * - 메시지 아래 반응 칩을 표시하고 현재 사용자의 반응 여부를 함께 노출
 *
 * [이미지 처리]
 * - 이미지가 포함된 경우 꽉 찬 썸네일(`object-cover`)을 제공
 * - 확대 모달은 게시글/제품 이미지와 같은 공용 원본 보기 UX를 재사용
 */
export default function ChatMessageBubble({
  message,
  currentUserId,
  isOwnMessage,
  showAvatar,
  onReport,
  onDelete,
  onReact,
  searchHighlight = null,
}: ChatMessageBubbleProps) {
  const isMobile = useIsMobile();
  const [isZoomed, setIsZoomed] = useState(false);
  const hasImage = !!message.image && !message.deleted_at;
  const hasCaption = hasImage && !!message.payload;
  const canCopyMessage = !!message.payload?.trim() && !message.deleted_at;
  const canReactMessage =
    !message.deleted_at &&
    message.type !== "SYSTEM" &&
    message.type !== "APPOINTMENT" &&
    !!onReact;
  const canReportMessage = !isOwnMessage && !!onReport && !message.deleted_at;
  const canDeleteMessage = isOwnMessage && !!onDelete && !message.deleted_at;
  const hasMessageActions =
    canReactMessage || canCopyMessage || canReportMessage || canDeleteMessage;
  const hasDesktopQuickActions = canReactMessage || hasMessageActions;
  const reactionSummaries = message.reactions.filter(
    (reaction) => reaction.count > 0
  );

  // 메뉴 상태 관리
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const [desktopMenuPosition, setDesktopMenuPosition] = useState<{
    top: number;
    left: number;
    openBelow: boolean;
  } | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const onClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showMenu]);

  useEffect(() => {
    if (isMobile || !showMenu || !menuButtonRef.current) {
      if (!showMenu) setDesktopMenuPosition(null);
      return;
    }

    // 데스크톱 메뉴 위치 계산
    // 상단 메시지는 아래로 열고, 그 외에는 버튼 위쪽으로 열어 헤더 겹침 회피
    const MENU_WIDTH = 224;
    const SAFE_GUTTER = 12;
    const SAFE_TOP = 72;
    const ESTIMATED_MENU_HEIGHT = canReactMessage ? 236 : 152;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const openBelow = rect.top < SAFE_TOP + ESTIMATED_MENU_HEIGHT;
    const rawLeft = isOwnMessage ? rect.right - MENU_WIDTH : rect.left;
    const left = Math.min(
      Math.max(SAFE_GUTTER, rawLeft),
      window.innerWidth - MENU_WIDTH - SAFE_GUTTER
    );

    setDesktopMenuPosition({
      top: openBelow ? rect.bottom + 8 : rect.top - 8,
      left,
      openBelow,
    });
  }, [canReactMessage, isMobile, isOwnMessage, showMenu]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLongPressStart = () => {
    if (!isMobile || !hasMessageActions) return;

    clearLongPressTimer();
    didLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      setShowMenu(true);
    }, 420);
  };

  const handleLongPressEnd = () => {
    clearLongPressTimer();
  };

  useEffect(() => clearLongPressTimer, []);

  const handleCopyMessage = async () => {
    if (!message.payload?.trim()) return;

    try {
      await navigator.clipboard.writeText(message.payload);
      toast.success("메시지를 복사했습니다.");
      setShowMenu(false);
    } catch {
      toast.error("메시지 복사에 실패했습니다.");
    }
  };

  const handleDeleteMessage = () => {
    setShowMenu(false);
    onDelete?.(message.id);
  };

  const handleToggleReaction = (reactionKey: ChatMessageReactionKey) => {
    setShowMenu(false);
    onReact?.(message.id, reactionKey);
  };

  const renderReactionPicker = () => {
    if (!canReactMessage) return null;

    return (
      <div className="border-b border-border-subtle px-3 py-3">
        <p className="mb-2 text-xs font-medium text-muted">반응 추가</p>
        <div className="flex flex-wrap gap-2">
          {CHAT_MESSAGE_REACTION_KEYS.map((reactionKey) => {
            const meta = CHAT_MESSAGE_REACTION_META[reactionKey];
            const reactedByMe = message.reactions.some(
              (reaction) =>
                reaction.key === reactionKey &&
                reaction.userIds.includes(currentUserId)
            );

            return (
              <button
                key={reactionKey}
                type="button"
                onClick={() => handleToggleReaction(reactionKey)}
                className={cn(
                  "inline-flex min-w-11 items-center justify-center rounded-full border px-2.5 py-2 text-base transition-colors",
                  reactedByMe
                    ? "border-brand/45 bg-brand/10 shadow-sm dark:border-brand-light/45 dark:bg-brand-light/10"
                    : "border-border-subtle bg-background hover:bg-surface-dim"
                )}
                aria-label={meta.label}
                title={meta.label}
              >
                <span aria-hidden="true">{meta.emoji}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const bubbleHighlightClass = cn(
    searchHighlight === "active" &&
      (isOwnMessage
        ? "ring-2 ring-white/85 ring-offset-2 ring-offset-background shadow-lg dark:ring-white/90"
        : "ring-2 ring-brand/55 ring-offset-2 ring-offset-background shadow-md dark:ring-brand-light/60"),
    searchHighlight === "hit" &&
      (isOwnMessage
        ? "ring-2 ring-white/55 ring-offset-1 ring-offset-background shadow-md dark:ring-white/45"
        : "ring-2 ring-brand/45 ring-offset-1 ring-offset-background shadow-sm dark:ring-brand-light/50")
  );

  const bubbleToneClass = message.deleted_at
    ? cn(
        "bg-surface-dim text-muted border border-border-subtle",
        isOwnMessage ? "rounded-br-none" : "rounded-bl-none"
      )
    : isOwnMessage
      ? "bg-brand text-white ring-1 ring-black/5 dark:bg-brand dark:ring-white/10 rounded-br-none"
      : "bg-surface text-primary border border-border-subtle rounded-bl-none dark:bg-surface-dim dark:border-border";

  const renderActionMenuItems = () => (
    <>
      {canCopyMessage && (
        <button
          type="button"
          onClick={handleCopyMessage}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
        >
          <ClipboardDocumentIcon className="size-4" />
          복사하기
        </button>
      )}
      {canDeleteMessage && (
        <button
          type="button"
          onClick={handleDeleteMessage}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/5"
        >
          <TrashIcon className="size-4" />
          삭제하기
        </button>
      )}
      {canReportMessage && (
        <button
          type="button"
          onClick={() => {
            setShowMenu(false);
            onReport?.(message.id);
          }}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/5"
        >
          <ExclamationTriangleIcon className="size-4" />
          신고하기
        </button>
      )}
    </>
  );

  const desktopMenu =
    showMenu && !isMobile && desktopMenuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[70] w-56 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl backdrop-blur-sm"
            style={{
              top: desktopMenuPosition.top,
              left: desktopMenuPosition.left,
              transform: desktopMenuPosition.openBelow
                ? "translateY(0)"
                : "translateY(-100%)",
            }}
          >
            {renderReactionPicker()}
            {renderActionMenuItems()}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={cn(
          "flex w-full group",
          isOwnMessage ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "flex gap-1.5 items-end",
            message.image
              ? "max-w-[72%] sm:max-w-[62%]"
              : "max-w-[85%] sm:max-w-[75%]",
            isOwnMessage ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Avatar (상대방일 때만) */}
          {!isOwnMessage && (
            <div className="shrink-0 w-8 sm:w-9 flex flex-col justify-start self-start">
              {showAvatar ? (
                <UserAvatar
                  avatar={message.user.avatar}
                  username={message.user.username}
                  size="sm"
                  showUsername={false}
                  className="p-0"
                  compact
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
            <div
              className={cn(
                "flex items-end gap-1.5",
                isOwnMessage ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Bubble Container */}
              <div className="relative">
                {hasDesktopQuickActions && (
                  <div
                    className={cn(
                      "pointer-events-none absolute z-20 hidden items-center gap-1 rounded-full bg-background/92 px-1.5 py-1 shadow-lg transition-all duration-150 dark:bg-surface-dim/92 md:flex",
                      isOwnMessage
                        ? "right-0 -top-8 translate-x-1"
                        : "left-0 -top-8 -translate-x-1",
                      showMenu
                        ? "translate-y-0 opacity-100"
                        : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                    )}
                  >
                    {canReactMessage &&
                      DESKTOP_QUICK_REACTION_KEYS.map((reactionKey) => {
                        const meta = CHAT_MESSAGE_REACTION_META[reactionKey];
                        const reactedByMe = message.reactions.some(
                          (reaction) =>
                            reaction.key === reactionKey &&
                            reaction.userIds.includes(currentUserId)
                        );

                        return (
                          <button
                            key={reactionKey}
                            type="button"
                            onClick={() => handleToggleReaction(reactionKey)}
                            className={cn(
                              "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full text-sm transition-colors",
                              reactedByMe
                                ? "bg-brand/10 shadow-sm dark:bg-brand-light/10"
                                : "bg-surface text-primary hover:bg-surface-dim dark:bg-background"
                            )}
                            aria-label={meta.label}
                            title={meta.label}
                          >
                            <span aria-hidden="true">{meta.emoji}</span>
                          </button>
                        );
                      })}

                    {hasMessageActions && (
                      <button
                        ref={menuButtonRef}
                        type="button"
                        onClick={() => setShowMenu(!showMenu)}
                        className={cn(
                          "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full bg-surface text-primary/90 shadow-sm transition-colors dark:bg-background dark:text-primary/85",
                          "hover:bg-surface-dim hover:text-primary dark:hover:bg-surface-dim",
                          showMenu && "bg-surface-dim text-primary"
                        )}
                        aria-label="메시지 옵션"
                        aria-expanded={showMenu}
                        aria-haspopup="menu"
                      >
                        <EllipsisVerticalIcon className="size-4" />
                      </button>
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl shadow-sm transition-shadow",
                    bubbleToneClass,
                    hasImage ? "p-1.5" : "px-3 py-2",
                    bubbleHighlightClass
                  )}
                  onPointerDown={handleLongPressStart}
                  onPointerUp={handleLongPressEnd}
                  onPointerLeave={handleLongPressEnd}
                  onPointerCancel={handleLongPressEnd}
                  onPointerMove={handleLongPressEnd}
                >
                  {/* 이미지 렌더링 */}
                  {hasImage && (
                    <div
                      className="relative cursor-pointer group"
                      onClick={() => {
                        if (didLongPressRef.current) {
                          didLongPressRef.current = false;
                          return;
                        }
                        setIsZoomed(true);
                      }}
                    >
                      {/* 썸네일: 작은 화면에서는 한 단계 더 조여 말풍선 비중을 낮춘다. */}
                      <div className="relative h-[152px] w-[152px] rounded-xl bg-black/5 overflow-hidden sm:h-[188px] sm:w-[188px] lg:h-[208px] lg:w-[208px] dark:bg-white/5">
                        <Image
                          src={`${message.image}/public`}
                          alt="채팅 이미지"
                          fill
                          unoptimized={!!message.imageIsAnimated}
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 152px, (max-width: 1024px) 188px, 208px"
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <MagnifyingGlassPlusIcon className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      </div>
                    </div>
                  )}

                  {message.deleted_at && (
                    <p className="text-sm italic leading-relaxed text-muted/80">
                      삭제된 메시지입니다.
                    </p>
                  )}

                  {/* 텍스트 */}
                  {message.payload && !message.deleted_at && (
                    <div
                      className={cn(
                        "text-sm leading-relaxed break-words whitespace-pre-wrap",
                        "overflow-wrap-anywhere",
                        hasCaption &&
                          "mt-1.5 border-t px-2.5 pb-1 pt-2.5 leading-6",
                        hasCaption &&
                          (isOwnMessage
                            ? "border-white/12 text-white"
                            : "border-border-subtle text-primary")
                      )}
                    >
                      {message.payload}
                    </div>
                  )}
                </div>
              </div>

              {/* Time & Status */}
              <div className="mb-0.5 flex shrink-0 flex-col text-[11px] font-medium text-muted">
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

            {reactionSummaries.length > 0 && !message.deleted_at && (
              <div
                className={cn(
                  "mt-1 flex max-w-full flex-wrap gap-1.5",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
              >
                {reactionSummaries.map((reaction) => {
                  const meta = CHAT_MESSAGE_REACTION_META[reaction.key];
                  const reactedByMe = reaction.userIds.includes(currentUserId);

                  return (
                    <button
                      key={reaction.key}
                      type="button"
                      onClick={() => onReact?.(message.id, reaction.key)}
                      disabled={!canReactMessage}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors",
                        reactedByMe
                          ? "border-brand/45 bg-brand/10 text-primary dark:border-brand-light/45 dark:bg-brand-light/10"
                          : "border-border-subtle bg-background/90 text-muted hover:bg-surface-dim"
                      )}
                    >
                      <span aria-hidden="true">{meta.emoji}</span>
                      <span>{reaction.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {message.image && (
        <ImageZoomModal
          open={isZoomed}
          src={`${message.image}/public`}
          alt="원본 이미지"
          isAnimated={!!message.imageIsAnimated}
          onClose={() => setIsZoomed(false)}
        />
      )}

      {desktopMenu}

      {isMobile && hasMessageActions && (
        <BottomSheet
          open={showMenu}
          title="메시지 옵션"
          description="원하는 작업을 선택해주세요."
          onClose={() => setShowMenu(false)}
          contentClassName="pt-2"
        >
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
            {renderReactionPicker()}
            {renderActionMenuItems()}
          </div>
          <button
            type="button"
            onClick={() => setShowMenu(false)}
            className="mt-3 w-full rounded-2xl border border-border-subtle bg-background px-4 py-3 text-sm font-medium text-primary"
          >
            닫기
          </button>
        </BottomSheet>
      )}
    </>
  );
}

