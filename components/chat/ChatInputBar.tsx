/**
 * File Name : components/chat/ChatInputBar
 * Description : 채팅 입력창 컴포넌트 (textarea / IME 안전 / 중복 제출 방지 / 실패 시 복원)
 * Author : 임도헌
 *
 * Key Points
 * - textarea 기반: Enter=전송, Shift+Enter=줄바꿈
 * - IME(한글/일본어 등) 조합 중 Enter 전송 방지
 * - 초단간 중복 제출 방지(lastSubmitAtRef)
 * - 전송 중에도 입력은 가능(버튼만 disabled) → UX 끊김 방지
 * - 전송 실패 시 입력값 복원(사용자 작성 내용 보호)
 * - autoFocus 옵션: 마운트 및 제출 종료 시 포커스 복구
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.14  임도헌   Created   ChatMessagesList에서 분리
 * 2025.07.15  임도헌   Modified  UI 변경
 * 2025.07.16  임도헌   Modified  최소 채팅 기능에 맞춤
 * 2025.07.22  임도헌   Modified  입력값, 포커스 내부에서 완전 관리
 * 2025.09.05  임도헌   Modified  IME 조합 중 Enter 전송 방지 + 초단간 중복 제출 방지
 * 2026.01.03  임도헌   Modified  textarea 전환(Enter=전송/Shift+Enter 줄바꿈),
 *                                전송 중 입력 허용(버튼만 비활성화),
 *                                전송 실패 시 텍스트 복원, autoFocus/포커스 복구 강화
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.12  임도헌   Modified  [UI/UX] 320px 대응을 위해 Floating에서 Solid Bar로 변경, 높이 자동 조절 textarea 적용
 */
"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ChatInputBarProps {
  isSubmitting: boolean;
  onSubmit: (text: string) => Promise<void> | void;
  autoFocus?: boolean;
}

export default function ChatInputBar({
  isSubmitting,
  onSubmit,
  autoFocus = false,
}: ChatInputBarProps) {
  const [text, setText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 높이 자동 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`; // 최대 높이 제한
  }, [text]);

  const submit = async () => {
    if (isComposing || isSubmitting) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      // 전송 시도 전에 텍스트 초기화 (Optimistic feel)
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await onSubmit(trimmed);
    } catch {
      // 실패 시 복구
      setText(trimmed);
    }
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={cn(
        "w-full px-3 py-2 sm:px-4 transition-colors",
        "flex items-end gap-2"
      )}
    >
      <div className="flex-1 bg-surface-dim rounded-[20px] px-4 py-2 border border-transparent focus-within:border-brand/50 focus-within:bg-surface transition-colors flex items-center">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="메시지를 입력하세요"
          className="w-full bg-transparent border-none p-0 text-sm sm:text-base text-primary placeholder:text-muted resize-none max-h-[120px] focus:ring-0 leading-6"
          rows={1}
          autoFocus={autoFocus}
        />
      </div>

      <button
        onClick={submit}
        disabled={isSubmitting || !text.trim()}
        className={cn(
          "shrink-0 size-10 rounded-full flex items-center justify-center transition-all shadow-sm",
          "bg-brand-light dark:bg-brand text-white hover:bg-brand hover:dark:bg-brand-light active:scale-95",
          // [Disabled State] 가시성 개선: 배경색을 명확하게, 아이콘은 muted로
          "disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-muted disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
        )}
        aria-label="전송"
      >
        <PaperAirplaneIcon className="size-5 pl-0.5" />
      </button>
    </div>
  );
}
