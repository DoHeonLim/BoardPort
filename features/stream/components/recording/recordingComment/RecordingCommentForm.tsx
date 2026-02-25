/**
 * File Name : features/stream/components/recording/recordingComment/RecordingCommentForm.tsx
 * Description : 녹화본 댓글 작성 폼 컴포넌트 (VodAsset 단위)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.04  임도헌   Created   녹화본 댓글 폼 리팩토링 (react-hook-form + zod 적용)
 * 2025.09.10  임도헌   Modified  streamId hidden 필드 제거(타입 미스 방지), 로딩 토글 보장, 입력 trim
 * 2025.09.20  임도헌   Modified  VodAsset 전환(streamId → vodId), RHF defaultValues 정합성 유지
 * 2026.01.14  임도헌   Modified  [UI] ChatInputBar/CommentForm 스타일 통일
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRecordingCommentContext } from "@/features/stream/components/recording/recordingComment/RecordingCommentContext";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

/**
 * 댓글 작성 폼 컴포넌트
 *
 * [기능]
 * 1. 자동 높이 조절 Textarea 사용
 * 2. Enter 키 전송 지원 (Shift+Enter는 줄바꿈)
 * 3. Optimistic UI 패턴: 전송 시 입력창을 즉시 비우고, 실패 시 복원
 */
export default function RecordingCommentForm({ vodId }: { vodId: number }) {
  const { createComment } = useRecordingCommentContext();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 높이 자동 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const submit = async () => {
    if (isLoading || isComposing) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setText(""); // Optimistic Clear
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const formData = new FormData();
      formData.append("payload", trimmed);
      formData.append("vodId", String(vodId));

      await createComment(formData);
    } catch (e) {
      setText(trimmed); // Rollback
      console.error(e);
      toast.error("댓글 작성 실패");
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
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
        "w-full bg-surface border-t border-border py-3 transition-colors",
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
          placeholder="댓글을 남겨보세요..."
          className="w-full bg-transparent border-none p-0 text-sm sm:text-base text-primary placeholder:text-muted resize-none max-h-[120px] focus:ring-0 leading-6"
          rows={1}
        />
      </div>

      <button
        onClick={submit}
        disabled={isLoading || !text.trim()}
        className={cn(
          "shrink-0 size-10 rounded-full flex items-center justify-center transition-all",
          "bg-brand text-white hover:bg-brand-light active:scale-95 shadow-sm",
          "disabled:bg-surface-dim disabled:text-muted/50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
        )}
        aria-label="댓글 등록"
      >
        {isLoading ? (
          <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <PaperAirplaneIcon className="size-5 pl-0.5" />
        )}
      </button>
    </div>
  );
}
