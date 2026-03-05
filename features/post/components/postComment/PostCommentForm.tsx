/**
 * File Name : features/post/components/postComment/PostCommentForm.tsx
 * Description : 댓글 폼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.06  임도헌   Created
 * 2024.11.06  임도헌   Modified  댓글 폼 추가
 * 2024.11.06  임도헌   Modified  useOptimistic기능으로 댓글 추가 구현
 * 2024.12.19  임도헌   Modified  댓글 폼 스타일 변경
 * 2024.12.29  임도헌   Modified  댓글 input에 text색 변경
 * 2025.05.08  임도헌   Modified  alert를 toast로 변경
 * 2025.07.06  임도헌   Modified  낙관적 업데이트 삭제
 * 2026.01.13  임도헌   Modified  [UI/UX] ChatInputBar 스타일로 통일 (Textarea, Auto-height, Enter-submit)
 * 2026.01.16  임도헌   Renamed   CommentForm -> PostCommentForm
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.03  임도헌   Modified  Context 참조 제거 및 useCreatePostCommentMutation 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useRef, useState, useEffect } from "react";
import { useCreatePostCommentMutation } from "@/features/post/hooks/useCreatePostCommentMutation";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * 댓글 작성 폼 컴포넌트
 *
 * [상호작용 및 상태 제어 로직]
 * - `useCreatePostCommentMutation` 훅을 활용한 댓글 데이터 서버 전송 및 캐시 무효화 유도
 * - `textarea` 입력 내용 기반 자동 높이 조절 로직 적용
 * - IME(한글 등) 조합 중 중복 전송 방지(`isComposing`) 및 단축키(Enter 전송, Shift+Enter 개행) 처리
 * - 작성 시도 즉시 입력창 초기화 후, 실패 시 입력값 복원(Rollback) 적용
 */
export default function PostCommentForm({ postId }: { postId: number }) {
  const { mutateAsync: createComment, isPending } =
    useCreatePostCommentMutation(postId);
  const [text, setText] = useState("");
  const [isComposing, setIsComposing] = useState(false); // IME 입력 중 여부
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Textarea 높이 자동 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const submit = async () => {
    if (isPending || isComposing) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.length < 2) {
      toast.error("댓글은 최소 2자 이상 입력해주세요.");
      return;
    }

    setText(""); // 낙관적 폼 초기화
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const formData = new FormData();
      formData.append("payload", trimmed);
      formData.append("postId", postId.toString());

      await createComment(formData);
    } catch {
      setText(trimmed); // 에러 시 복구함.
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
    <div
      className={cn(
        "w-full bg-transparent py-1 transition-colors",
        "flex items-end gap-2"
      )}
    >
      <div className="flex-1 bg-surface-dim rounded-[20px] px-4 py-2 border border-transparent focus-within:border-brand/50 dark:focus-within:border-brand-light/50 focus-within:bg-surface transition-colors flex items-center">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="항해 일지를 남겨보세요..."
          className="w-full bg-transparent border-none p-0 text-sm sm:text-base text-primary placeholder:text-muted resize-none max-h-[120px] focus:ring-0 leading-6"
          rows={1}
        />
      </div>

      <button
        onClick={submit}
        disabled={isPending || !text.trim()}
        className={cn(
          "shrink-0 size-10 rounded-full flex items-center justify-center transition-all shadow-sm",
          "bg-brand-light dark:bg-brand text-white hover:bg-brand hover:dark:bg-brand-light active:scale-95",
          "disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-muted disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
        )}
        aria-label="댓글 등록"
      >
        {isPending ? (
          <div className="size-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
        ) : (
          <PaperAirplaneIcon className="size-5 pl-0.5" />
        )}
      </button>
    </div>
  );
}
