/**
 * File Name : features/chat/components/ChatInputBar.tsx
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
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.04  임도헌   Modified  이미지 업로드 기능 추가 (PhotoIcon, Preview, CF Upload 연동)
 * 2026.02.19  임도헌   Modified  ChatActionMenu로 통합(이미지 업로드, 약속 잡기)
 * 2026.02.25  임도헌   Modified  Cloudflare Images hash 하드코딩 제거
 * 2026.02.26  임도헌   Modified  다크모드 개선 및 autoFocus 제거
 * 2026.03.06  임도헌   Modified  이미지 제거/메시지 전송 버튼 접근성 라벨 보강
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/solid";
import ChatActionMenu from "@/features/chat/components/ChatActionMenu";

interface ChatInputBarProps {
  isSubmitting: boolean;
  onSubmit: (text: string, imageUrl?: string | null) => Promise<void> | void;
  onScheduleOpen?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * 채팅 입력바
 *
 * [기능]
 * - Textarea 자동 높이 조절
 * - Enter 키 전송 (Shift+Enter 줄바꿈)
 * - IME 입력 중(한글 조합 등) 전송 방지
 * - Optimistic UI 패턴: 전송 시도 시 입력창 즉시 비움 (실패 시 복원 로직은 상위에서 처리)
 */
export default function ChatInputBar({
  isSubmitting,
  onSubmit,
  onScheduleOpen,
  autoFocus = false,
  disabled = false,
}: ChatInputBarProps) {
  // States
  const [text, setText] = useState(""); // 메세지
  const [isComposing, setIsComposing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // 이미지 프리뷰
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null); // 이미지 URL
  const [isUploading, setIsUploading] = useState(false); // 로딩

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 사진 선택 트리거 (ActionMenu에서 호출)
  const triggerPhotoSelect = () => {
    fileInputRef.current?.click();
  };

  // 1. 이미지 선택 및 업로드 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 용량 제한 (채팅은 더 가볍게 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("이미지 크기는 2MB를 초과할 수 없습니다.");
      return;
    }

    setIsUploading(true);
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);

    try {
      // 1) CF Upload URL 발급
      const res = await getUploadUrl();
      if (!res.success) throw new Error("URL 발급 실패");

      // 2) 실제 업로드
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch(res.result.uploadURL, {
        method: "POST",
        body: fd,
      });
      if (!uploadRes.ok) throw new Error("업로드 실패");

      const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
      const finalUrl = `https://imagedelivery.net/${CF_HASH}/${res.result.id}`;
      setUploadedUrl(finalUrl);
    } catch (err) {
      console.error(err);
      toast.error("이미지 업로드에 실패했습니다.");
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // 이미지 삭제
  const removeImage = () => {
    setImagePreview(null);
    setUploadedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 2. 메시지 제출
  const submit = async () => {
    if (isComposing || isSubmitting || isUploading) return;
    const trimmed = text.trim();
    if (!trimmed && !uploadedUrl) return;

    try {
      const currentUrl = uploadedUrl;
      setText("");
      removeImage(); // 전송 시도 시 프리뷰 제거
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      await onSubmit(trimmed, currentUrl);
    } catch {
      setText(trimmed);
      setUploadedUrl(uploadedUrl);
    }
    textareaRef.current?.focus();
  };

  // 높이 자동 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`; // 최대 높이 제한
  }, [text]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="w-full px-3 py-2 sm:px-4 flex flex-col gap-2">
      {/* 이미지 프리뷰 영역 */}
      {imagePreview && (
        <div className="flex px-1 animate-fade-in">
          <div className="relative size-20 rounded-xl overflow-hidden border border-border shadow-sm group">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <button
              onClick={removeImage}
              aria-label="첨부 이미지 제거"
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* 사진 선택 버튼 */}
        <ChatActionMenu
          onSelectPhoto={triggerPhotoSelect}
          onSelectAppointment={() => onScheduleOpen?.()}
          disabled={isUploading || isSubmitting || disabled}
        />
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageChange}
        />

        <div className="flex-1 bg-surface-dim rounded-[20px] px-4 py-2 border border-transparent focus-within:border-brand/50 dark:focus-within:border-brand-light/50 focus-within:bg-surface transition-colors flex items-center">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={
              disabled
                ? "대화 상대가 채팅방을 나갔습니다."
                : "메시지를 입력하세요"
            }
            disabled={disabled}
            className="w-full bg-transparent border-none p-0 text-base md:text-sm text-primary placeholder:text-muted resize-none max-h-[120px] focus:ring-0 leading-6"
            rows={1}
            autoFocus={autoFocus}
          />
        </div>

        {/* 전송 */}
        <button
          onClick={submit}
          disabled={
            isSubmitting ||
            isUploading ||
            (!text.trim() && !uploadedUrl) ||
            disabled
          }
          aria-label="메시지 전송"
          className={cn(
            "shrink-0 size-10 rounded-full flex items-center justify-center transition-all shadow-sm",
            "bg-brand-light dark:bg-brand text-white hover:bg-brand active:scale-95",
            "disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-muted disabled:cursor-not-allowed"
          )}
        >
          <PaperAirplaneIcon className="size-5 pl-0.5" />
        </button>
      </div>
    </div>
  );
}
