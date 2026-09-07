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
 * 2026.03.17  임도헌   Modified  녹화 상세용 댓글 입력바를 단일 패널 구조로 정리해 옛날형 block 톤을 완화
 * 2026.03.19  임도헌   Modified  댓글 입력바 외곽 패널을 solid 톤으로 조정해 배경 위 가시성을 보강
 * 2026.03.25  임도헌   Modified  라이트 모드 댓글 입력창 대비를 소폭 올려 첫인상 가시성을 보강
 * 2026.03.27  임도헌   Modified  녹화 댓글 전송 버튼에 다크 밀집 화면용 아이콘 전용 quiet-dark 버튼 변형 적용
 * 2026.04.20  임도헌   Modified  댓글 입력 포커스가 내부 textarea 기본 outline으로 보이지 않도록 외곽 패널 중심으로 정리
 * 2026.05.30  임도헌   Modified  모바일 버튼 전송, 데스크톱 Enter 전송 기준으로 녹화 댓글 입력 정책 정리
 * 2026.08.13  임도헌   Modified  다시보기 댓글 생성 cache를 현재 조회자로 제한
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
 * - 모바일 버튼 전송, 데스크톱 Enter 전송, Shift+Enter 개행 처리
 * - IME(한글 등) 조합 중 Enter 전송 방지와 명시 버튼 전송 허용
 * - 작성 시도 즉시 입력창 비움 처리(Optimistic Clear) 후, 실패 시 입력값 복원(Rollback) 수행
 */
export default function RecordingCommentForm({
  vodId,
  viewerId,
}: {
  vodId: number;
  viewerId: number;
}) {
  const { mutateAsync: createComment, isPending: isLoading } =
    useCreateRecordingCommentMutation(vodId, viewerId);
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

  const submit = async (options?: { allowComposing?: boolean }) => {
    if (isLoading || (!options?.allowComposing && isComposing)) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setText(""); // 낙관적 폼 초기화
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    textareaRef.current?.blur();

    try {
      const formData = new FormData();
      formData.append("payload", trimmed);
      formData.append("vodId", String(vodId));

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
    <div className="flex w-full items-end gap-2 rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm transition-colors focus-within:border-brand/40 dark:focus-within:border-brand-light/40">
      <div className="flex flex-1 items-center rounded-[20px] border border-black/[0.08] bg-surface-dim/80 px-4 py-2 dark:border-border-subtle dark:bg-surface-dim focus-within:border-brand/50 dark:focus-within:border-brand-light/50 focus-within:bg-background transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="댓글을 남겨보세요..."
          className="w-full max-h-[120px] resize-none border-none bg-transparent p-0 text-sm leading-6 text-primary placeholder:text-muted/80 dark:placeholder:text-muted sm:text-base focus:outline-none focus:ring-0"
          rows={1}
        />
      </div>

      <button
        onClick={() => submit({ allowComposing: true })}
        disabled={isLoading || !text.trim()}
        className={cn(
          "btn-primary-quiet-dark-icon flex size-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] transition-[background-color,color,border-color,box-shadow] shadow-sm dark:border-border-subtle",
          "active:scale-95",
          "disabled:bg-surface-dim disabled:text-muted/55 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
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
