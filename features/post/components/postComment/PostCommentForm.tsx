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
 * 2026.03.19  임도헌   Modified  댓글 입력바 외곽 패널을 solid 톤으로 정리해 상세 섹션 시작 가시성을 보강
 * 2026.03.30  임도헌   Modified  게시글 카테고리 plain 라벨 정리에 맞춰 댓글 플레이스홀더를 일반 문맥으로 조정
 * 2026.04.20  임도헌   Modified  댓글 입력 포커스가 내부 textarea 기본 outline으로 보이지 않도록 외곽 패널 중심으로 정리
 * 2026.04.26  임도헌   Modified  댓글 등록 버튼의 다크모드 hover 색조를 primary CTA 톤과 맞춰 정리
 * 2026.05.30  임도헌   Modified  모바일 버튼 전송, 데스크톱 Enter 전송 기준으로 댓글 입력 정책 정리
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
 * - 모바일 버튼 전송, 데스크톱 Enter 전송, Shift+Enter 개행 처리
 * - IME(한글 등) 조합 중 Enter 전송 방지와 명시 버튼 전송 허용
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

  const submit = async (options?: { allowComposing?: boolean }) => {
    if (isPending || (!options?.allowComposing && isComposing)) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.length < 2) {
      toast.error("댓글은 최소 2자 이상 입력해주세요.");
      return;
    }

    setText(""); // 낙관적 폼 초기화
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    textareaRef.current?.blur();

    try {
      const formData = new FormData();
      formData.append("payload", trimmed);
      formData.append("postId", postId.toString());

      await createComment(formData);
    } catch {
      setText(trimmed); // 에러 시 복구
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isDesktopInput =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (e.key === "Enter" && !e.shiftKey && !isComposing && isDesktopInput) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm transition-colors focus-within:border-brand/40 dark:focus-within:border-brand-light/40",
        "flex items-end gap-2"
      )}
    >
      <div className="flex flex-1 items-center rounded-[20px] border border-transparent bg-surface-dim px-4 py-2 transition-colors focus-within:bg-surface">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="댓글을 남겨보세요..."
          className="w-full max-h-[120px] resize-none border-none bg-transparent p-0 text-sm leading-6 text-primary placeholder:text-muted focus:outline-none focus:ring-0 sm:text-base"
          rows={1}
        />
      </div>

      <button
        onClick={() => submit({ allowComposing: true })}
        disabled={isPending || !text.trim()}
        className={cn(
          "focus-ring-soft shrink-0 size-10 rounded-full flex items-center justify-center transition-[background-color,color,border-color,box-shadow] shadow-sm",
          "bg-brand text-white hover:bg-brand-dark dark:bg-brand dark:hover:bg-brand-dark active:scale-95",
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
