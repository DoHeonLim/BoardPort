/**
 * File Name : features/chat/components/ChatInputBar.tsx
 * Description : 채팅 입력창 컴포넌트 (textarea / IME 안전 / 중복 제출 방지 / 실패 시 복원)
 * Author : 임도헌
 *
 * Key Points
 * - textarea 기반: 모바일은 버튼 전송, 데스크톱은 Enter=전송/Shift+Enter=줄바꿈
 * - IME(한글/일본어 등) 조합 중 Enter 전송 방지, 명시 버튼 전송 허용
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
 * 2026.03.12  임도헌   Modified  채팅 이미지 전송 시 GIF 여부를 imageIsAnimated 메타로 함께 전달
 * 2026.03.27  임도헌   Modified  채팅 상세 전송 버튼에 다크 밀집 화면용 조용한 primary 톤 적용
 * 2026.03.27  임도헌   Modified  원형 전송 버튼 비율을 맞추기 위해 아이콘 전용 quiet-dark 버튼 변형 적용
 * 2026.04.05  임도헌   Modified  채팅 이미지 기본 일반화질 최적화와 원본 재업로드 선택 추가
 * 2026.04.09  임도헌   Modified  화질 전환 성공 토스트를 제거하고 실패 알림만 유지해 반복 토글 피로를 완화
 * 2026.04.10  임도헌   Modified  채팅 타이포 정책에 맞춰 업로드 상태/화질 칩 크기를 text-xs 기준으로 정리
 * 2026.04.10  임도헌   Modified  ChatMessagesList 클라이언트 경계 아래에서만 사용되도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.14  임도헌   Modified  채팅 입력 textarea 포커스 시 브라우저 기본 사각형 outline이 노출되지 않도록 정리
 * 2026.04.14  임도헌   Modified  데스크톱에서 이미지 첨부 후 Enter 전송이 자연스럽도록 업로드 완료 뒤 textarea 포커스 복구
 * 2026.05.28  임도헌   Modified  모바일은 버튼 전송, 데스크톱은 Enter 전송 기준으로 IME 정책 정리
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { MAX_PHOTO_SIZE, MAX_PHOTO_SIZE_MB } from "@/lib/constants";
import { PaperAirplaneIcon, XMarkIcon } from "@heroicons/react/24/solid";
import ChatActionMenu from "@/features/chat/components/ChatActionMenu";
import {
  canOptimizeChatImage,
  prepareChatImageForUpload,
  type ChatImageUploadMode,
} from "@/features/chat/utils/optimizeImage";

interface ChatInputBarProps {
  isSubmitting: boolean;
  onSubmit: (
    text: string,
    imageUrl?: string | null,
    imageIsAnimated?: boolean
  ) => Promise<void> | void;
  onScheduleOpen?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * 채팅 입력바
 *
 * [기능]
 * - Textarea 자동 높이 조절
 * - 모바일 버튼 전송, 데스크톱 Enter 전송, Shift+Enter 줄바꿈
 * - IME 입력 중(한글 조합 등) Enter 전송 방지와 명시 버튼 전송 허용
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
  const [imageIsAnimated, setImageIsAnimated] = useState(false); // GIF 여부
  const [isUploading, setIsUploading] = useState(false); // 로딩
  const [imageUploadMode, setImageUploadMode] =
    useState<ChatImageUploadMode>("optimized");

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageFileRef = useRef<File | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // 모바일 전송 탭 시 버튼으로 포커스가 이동하며 키보드가 닫히는 현상 방지
  const preventFocusSteal = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  // 사진 선택 트리거 (ActionMenu에서 호출)
  const triggerPhotoSelect = () => {
    // 이미지 첨부는 미리보기 공간을 여는 흐름이라 모바일 키보드를 먼저 정리
    textareaRef.current?.blur();
    fileInputRef.current?.click();
  };

  // 약속 제안은 별도 모달 입력 흐름으로 넘어가므로 키보드를 먼저 정리
  const triggerAppointmentOpen = () => {
    textareaRef.current?.blur();
    onScheduleOpen?.();
  };

  // 로컬 preview URL 수명 관리
  const replacePreviewUrl = (nextPreviewUrl: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextPreviewUrl;
    setImagePreview(nextPreviewUrl);
  };

  const focusTextareaOnDesktop = () => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  // 선택 원본과 업로드 모드에 맞춰 Cloudflare Images 업로드 수행
  const uploadSelectedImage = async (file: File, mode: ChatImageUploadMode) => {
    setIsUploading(true);
    setUploadedUrl(null);
    setImageUploadMode(mode);

    try {
      const uploadFile = await prepareChatImageForUpload(file, mode);

      // 1) CF Upload URL 발급
      const res = await getUploadUrl();
      if (!res.success) throw new Error("URL 발급 실패");

      // 2) 실제 업로드
      const fd = new FormData();
      fd.append("file", uploadFile);
      const uploadRes = await fetch(res.result.uploadURL, {
        method: "POST",
        body: fd,
      });
      if (!uploadRes.ok) throw new Error("업로드 실패");

      const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
      const finalUrl = `https://imagedelivery.net/${CF_HASH}/${res.result.id}`;
      setUploadedUrl(finalUrl);
    } finally {
      setIsUploading(false);
    }
  };

  // 1. 이미지 선택 및 업로드 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let uploadSucceeded = false;

    // 용량 제한
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error(`이미지 크기는 ${MAX_PHOTO_SIZE_MB}MB를 초과할 수 없습니다.`);
      e.target.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);
    replacePreviewUrl(localPreview);
    originalImageFileRef.current = file;
    setImageIsAnimated(file.type === "image/gif");

    try {
      // 기본 전송은 일반화질 최적화
      await uploadSelectedImage(
        file,
        canOptimizeChatImage(file) ? "optimized" : "original"
      );
      uploadSucceeded = true;
    } catch (err) {
      console.error(err);
      toast.error("이미지 업로드에 실패했습니다.");
      replacePreviewUrl(null);
      setUploadedUrl(null);
      setImageIsAnimated(false);
      originalImageFileRef.current = null;
      e.target.value = "";
    } finally {
      if (!originalImageFileRef.current && fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (uploadSucceeded) {
        focusTextareaOnDesktop();
      }
    }
  };

  // 이미지 삭제
  const removeImage = () => {
    replacePreviewUrl(null);
    setUploadedUrl(null);
    setImageIsAnimated(false);
    setImageUploadMode("optimized");
    originalImageFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 업로드 품질 전환
  const toggleImageUploadMode = async () => {
    const originalFile = originalImageFileRef.current;
    if (!originalFile || isUploading) return;

    const nextMode: ChatImageUploadMode =
      imageUploadMode === "optimized" ? "original" : "optimized";

    try {
      await uploadSelectedImage(originalFile, nextMode);
    } catch (error) {
      console.error(error);
      toast.error("이미지 업로드 방식 변경에 실패했습니다.");
    }
  };

  // 2. 메시지 제출
  const submit = async (options?: { allowComposing?: boolean }) => {
    if ((!options?.allowComposing && isComposing) || isSubmitting || isUploading)
      return;
    const trimmed = text.trim();
    if (!trimmed && !uploadedUrl) return;
    const currentUrl = uploadedUrl;
    const currentPreview = imagePreview;
    const currentImageIsAnimated = imageIsAnimated;

    try {
      setText("");
      removeImage(); // 전송 시도 시 프리뷰 제거
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      await onSubmit(trimmed, currentUrl, currentImageIsAnimated);
    } catch {
      setText(trimmed);
      setImagePreview(currentPreview);
      setUploadedUrl(currentUrl);
      setImageIsAnimated(currentImageIsAnimated);
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

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

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
    <div className="w-full px-3 py-2 sm:px-4 flex flex-col gap-2">
      {/* 이미지 프리뷰 영역 */}
      {imagePreview && (
        <div className="flex items-start gap-3 px-1">
          <div className="relative size-20 rounded-xl overflow-hidden border border-border shadow-sm group">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              unoptimized={imageIsAnimated}
              className="object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-2 px-2 text-center">
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-xs font-medium leading-4 text-white/95">
                  이미지 업로드 중...
                </p>
              </div>
            )}
            <button
              onClick={removeImage}
              onMouseDown={preventFocusSteal}
              onPointerDown={preventFocusSteal}
              aria-label="첨부 이미지 제거"
              className="focus-ring-soft absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {imageIsAnimated ? (
                <span className="inline-flex rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-primary">
                  GIF 원본
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (imageUploadMode !== "optimized") {
                        void toggleImageUploadMode();
                      }
                    }}
                    disabled={isUploading}
                    className={cn(
                      "focus-ring-soft inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      imageUploadMode === "optimized"
                        ? "border-brand/35 bg-brand/10 text-primary dark:border-brand-light/35 dark:bg-brand-light/10"
                        : "border-border-subtle bg-surface text-muted hover:text-primary",
                      "disabled:cursor-not-allowed disabled:text-muted"
                    )}
                  >
                    일반 화질
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (imageUploadMode !== "original") {
                        void toggleImageUploadMode();
                      }
                    }}
                    disabled={isUploading}
                    className={cn(
                      "focus-ring-soft inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      imageUploadMode === "original"
                        ? "border-brand/35 bg-brand/10 text-primary dark:border-brand-light/35 dark:bg-brand-light/10"
                        : "border-border-subtle bg-surface text-muted hover:text-primary",
                      "disabled:cursor-not-allowed disabled:text-muted"
                    )}
                  >
                    원본 화질
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* 사진 선택 버튼 */}
        <ChatActionMenu
          onSelectPhoto={triggerPhotoSelect}
          onSelectAppointment={triggerAppointmentOpen}
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
            className="w-full bg-transparent border-none p-0 text-base md:text-sm text-primary placeholder:text-muted resize-none max-h-[120px] leading-6 outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
            rows={1}
            autoFocus={autoFocus}
          />
        </div>

        {/* 전송 */}
        <button
          onClick={() => submit({ allowComposing: true })}
          onMouseDown={preventFocusSteal}
          onPointerDown={preventFocusSteal}
          disabled={
            isSubmitting ||
            isUploading ||
            (!text.trim() && !uploadedUrl) ||
            disabled
          }
          aria-label="메시지 전송"
          className={cn(
            "btn-primary-quiet-dark-icon shrink-0 size-10 rounded-full flex items-center justify-center transition-[background-color,color,border-color,box-shadow] shadow-sm",
            "active:scale-95",
            "disabled:bg-surface-dim disabled:text-muted disabled:cursor-not-allowed"
          )}
        >
          <PaperAirplaneIcon className="size-5 pl-0.5" />
        </button>
      </div>
    </div>
  );
}
