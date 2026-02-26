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
 * 2026.02.04  임도헌   Modified  이미지 포함 메시지 렌더링 로직 추가
 * 2026.02.06  임도헌   Modified  상대방 메시지에 신고 메뉴(더보기) UI 추가
 * 2026.02.23  임도헌   Modified  다크 모드 시 본인 말풍선 가시성 개선 (bg-brand-light)
 * 2026.02.26  임도헌   Modified  메세지 오버플로우 방지
 */
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/features/chat/types";
import {
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showAvatar: boolean;
  onReport?: (messageId: number) => void;
}

/**
 * 개별 메시지 말풍선
 * - 본인 메시지는 우측, 상대 메시지는 좌측 정렬
 * - 이미지 클릭 시 전체 화면 확대 (Lightbox)
 * [이미지 처리]
 * - 이미지가 포함된 경우 꽉 찬 썸네일(`object-cover`)을 제공.
 * - 클릭 시 전체 화면 확대 모달(Lightbox)을 제공하여 원본 비율로 시청 가능.
 * - `ESC` 키 또는 배경 클릭으로 확대를 해제.
 * 상대방 메시지 호버 시 더보기 메뉴(...)를 통해 신고 기능 제공.
 */
export default function ChatMessageBubble({
  message,
  isOwnMessage,
  showAvatar,
  onReport,
}: ChatMessageBubbleProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  // 메뉴 상태 관리
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showMenu]);

  // 모달 열렸을 때 스크롤 잠금
  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isZoomed]);

  // ESC 키로 닫기
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isZoomed) setIsZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZoomed]);

  return (
    <>
      <div
        className={cn(
          "flex w-full animate-fade-in group",
          isOwnMessage ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "flex max-w-[85%] sm:max-w-[75%] gap-1.5 items-end",
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
              <div
                className={cn(
                  "rounded-2xl shadow-sm relative overflow-hidden",
                  isOwnMessage
                    ? "bg-brand dark:bg-brand-light text-white rounded-br-none"
                    : "bg-surface text-primary border border-border rounded-bl-none",
                  message.image ? "p-1" : "px-3 py-2"
                )}
              >
                {/* 이미지 렌더링 */}
                {message.image && (
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setIsZoomed(true)}
                  >
                    {/* 썸네일: aspect-square 제거하고 최대 크기 제한 + cover로 깔끔하게 */}
                    <div className="relative w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden">
                      <Image
                        src={`${message.image}/public`}
                        alt="채팅 이미지"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 200px, 240px"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <MagnifyingGlassPlusIcon className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                    </div>
                  </div>
                )}

                {/* 텍스트 */}
                {message.payload && (
                  <div
                    className={cn(
                      "text-sm leading-relaxed break-words whitespace-pre-wrap",
                      "overflow-wrap-anywhere"
                    )}
                  >
                    {message.payload}
                  </div>
                )}
              </div>

              {/* Time & Status */}
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

              {/* 신고 메뉴 버튼 (상대방 메시지에만 표시) */}
              {!isOwnMessage && onReport && (
                <div
                  className="relative opacity-0 group-hover:opacity-100 transition-opacity"
                  ref={menuRef}
                >
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 text-muted hover:text-primary rounded-full hover:bg-surface-dim transition-colors"
                    aria-label="메시지 옵션"
                  >
                    <EllipsisVerticalIcon className="size-4" />
                  </button>

                  {showMenu && (
                    <div className="absolute left-0 bottom-full mb-1 w-28 bg-surface rounded-lg shadow-xl border border-border z-10 overflow-hidden animate-fade-in">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onReport(message.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-danger hover:bg-danger/5 flex items-center gap-2"
                      >
                        <ExclamationTriangleIcon className="size-3.5" />
                        신고하기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 확대 모달 */}
      {isZoomed && message.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-50"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>

          {/* Full Image */}
          <div
            className="relative w-full h-full max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()} // 이미지 클릭 시 닫히지 않도록
          >
            <Image
              src={`${message.image}/public`}
              alt="원본 이미지"
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
