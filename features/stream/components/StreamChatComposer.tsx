/**
 * File Name : features/stream/components/StreamChatComposer.tsx
 * Description : 스트림 채팅 입력창 및 전송 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * 2026.04.21  임도헌   Created   StreamChatRoom에서 입력/전송 영역을 분리
 */

import type { RefObject } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

interface StreamChatComposerProps {
  isMuted: boolean;
  message: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  preventFocusSteal: (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
  ) => void;
  isSubmitDisabled: boolean;
}

/**
 * 스트림 채팅 입력/전송 UI.
 * 입력 포커스, 채팅 제한 안내, 전송 버튼 상태를 한 곳에서 관리
 */
export default function StreamChatComposer({
  isMuted,
  message,
  textareaRef,
  onChange,
  onKeyDown,
  onSubmit,
  preventFocusSteal,
  isSubmitDisabled,
}: StreamChatComposerProps) {
  return (
    <div className="shrink-0 border-t border-black/[0.05] bg-surface px-3 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] dark:border-border-subtle">
      {isMuted && (
        <div className="mb-2 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-2 text-xs leading-5 text-danger">
          호스트가 현재 방송에서 회원님의 채팅을 제한했습니다. 시청은 계속할 수
          있지만 메시지는 보낼 수 없습니다.
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex min-h-[48px] flex-1 items-center rounded-[22px] border border-black/[0.08] bg-neutral-100 px-4 transition-colors focus-within:border-brand/50 focus-within:bg-surface dark:border-white/10 dark:bg-surface-dim dark:focus-within:border-brand-light/40 dark:focus-within:bg-surface dark:focus-within:ring-1 dark:focus-within:ring-brand-light/15">
          <textarea
            ref={textareaRef as RefObject<HTMLTextAreaElement>}
            value={message}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
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
          className="btn-primary-quiet-dark-icon flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm transition-[background-color,color,border-color,box-shadow] active:scale-95 disabled:cursor-not-allowed disabled:border disabled:border-black/8 disabled:bg-neutral-100 disabled:text-muted dark:disabled:border-white/10 dark:disabled:bg-neutral-700"
        >
          <PaperAirplaneIcon className="size-5 pl-0.5" />
        </button>
      </div>
    </div>
  );
}
