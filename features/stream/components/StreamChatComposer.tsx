/**
 * File Name : features/stream/components/StreamChatComposer.tsx
 * Description : 스트림 채팅 입력창 및 전송 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * 2026.04.21  임도헌   Created   StreamChatRoom에서 입력/전송 영역을 분리
 * 2026.05.28  임도헌   Modified  모바일 입력 집중 모드와 IME 정책 전달용 textarea 이벤트 props 추가
 * 2026.05.28  임도헌   Modified  입력 집중 모드에서 라이브 채팅형 입력 영역으로 밀도 조정
 * 2026.05.28  임도헌   Modified  모바일 입력바 높이와 safe-area 여백 압축
 */

import type { RefObject } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface StreamChatComposerProps {
  isMuted: boolean;
  message: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
  onSubmit: () => void;
  preventFocusSteal: (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
  ) => void;
  isSubmitDisabled: boolean;
  isFocusMode?: boolean;
}

/**
 * 스트림 채팅 입력/전송 UI
 *
 * 입력 포커스, 채팅 제한 안내, 전송 버튼 상태를 한 곳에서 관리
 */
export default function StreamChatComposer({
  isMuted,
  message,
  textareaRef,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  onCompositionStart,
  onCompositionEnd,
  onSubmit,
  preventFocusSteal,
  isSubmitDisabled,
  isFocusMode = false,
}: StreamChatComposerProps) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-black/[0.05] bg-surface px-2.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] dark:border-border-subtle lg:px-3 lg:pt-3 lg:pb-[calc(0.875rem+env(safe-area-inset-bottom))]",
        isFocusMode &&
          "max-lg:border-border-subtle/70 max-lg:bg-background max-lg:pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      )}
    >
      {isMuted && (
        <div className="mb-2 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-2 text-xs leading-5 text-danger">
          호스트가 현재 방송에서 회원님의 채팅을 제한했습니다. 시청은 계속할 수
          있지만 메시지는 보낼 수 없습니다.
        </div>
      )}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex min-h-[44px] flex-1 items-center rounded-full border border-black/[0.08] bg-neutral-100 px-3.5 transition-colors focus-within:border-brand/50 focus-within:bg-surface dark:border-white/10 dark:bg-surface-dim dark:focus-within:border-brand-light/40 dark:focus-within:bg-surface dark:focus-within:ring-1 dark:focus-within:ring-brand-light/15 lg:min-h-[48px] lg:rounded-[22px] lg:px-4",
            isFocusMode &&
              "max-lg:min-h-[42px] max-lg:bg-surface-dim/80 max-lg:px-3.5"
          )}
        >
          <textarea
            ref={textareaRef as RefObject<HTMLTextAreaElement>}
            value={message}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            placeholder={
              isMuted
                ? "현재 방송에서 채팅이 제한되었습니다"
                : "메시지를 입력하세요"
            }
            disabled={isMuted}
            className="w-full max-h-[100px] resize-none border-none bg-transparent p-0 py-0.5 text-sm leading-5 text-primary placeholder:text-muted/90 focus:outline-none focus:ring-0"
            rows={1}
          />
        </div>
        <button
          onClick={onSubmit}
          onMouseDown={preventFocusSteal}
          onPointerDown={preventFocusSteal}
          disabled={isSubmitDisabled}
          aria-label="메시지 전송"
          className={cn(
            "btn-primary-quiet-dark-icon flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-[background-color,color,border-color,box-shadow] active:scale-95 disabled:cursor-not-allowed disabled:border disabled:border-black/8 disabled:bg-neutral-100 disabled:text-muted dark:disabled:border-white/10 dark:disabled:bg-neutral-700 lg:size-11",
            isFocusMode && "max-lg:shadow-none"
          )}
        >
          <PaperAirplaneIcon className="size-5 pl-0.5" />
        </button>
      </div>
    </div>
  );
}
