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
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.03  임도헌   Modified  Context 참조 제거 및 useCreateRecordingCommentMutation 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCreateRecordingCommentMutation } from "@/features/stream/hooks/useCreateRecordingCommentMutation";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

/**
 * 녹화본 댓글 작성 폼 컴포넌트
 *
 * [상호작용 및 상태 제어 로직]
 * - `useCreateRecordingCommentMutation` 훅을 활용한 댓글 데이터 서버 전송 및 캐시 갱신 유도
 * - `textarea` 입력 텍스트 길이에 따른 자동 높이 조절 로직 적용
 * - IME(한글 등) 조합 중 중복 전송 방지(`isComposing`) 및 단축키(Enter 전송, Shift+Enter 개행) 지원
 * - 작성 시도 즉시 입력창 비움 처리(Optimistic Clear) 후, 실패 시 입력값 복원(Rollback) 수행
 */
export default function RecordingCommentForm({ vodId }: { vodId: number }) {
  const { mutateAsync: createComment, isPending: isLoading } =
    useCreateRecordingCommentMutation(vodId);
  const [text, setText] = useState("");
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

    setText(""); // 낙관적 폼 초기화
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const formData = new FormData();
      formData.append("payload", trimmed);
      formData.append("vodId", String(vodId));

      await createComment(formData);
    } catch {
      setText(trimmed); // 에러 시 복구
    } finally {
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
    <div className="w-full bg-surface border-t border-border py-3 transition-colors flex items-end gap-2">
      <div className="flex-1 bg-surface-dim rounded-[20px] px-4 py-2 border border-transparent focus-within:border-brand/50 dark:focus-within:border-brand-light/50 focus-within:bg-surface transition-colors flex items-center">
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
