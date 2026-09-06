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
 * 2026.08.22  임도헌   Modified  채팅 전용 업로드 용도와 서버가 반환한 MediaAsset delivery URL 사용
 * 2026.08.26  임도헌   Modified  응답 유실 뒤 재전송에도 같은 clientMessageId를 재사용
 * 2026.08.27  임도헌   Modified  채팅 이미지 미리보기의 고정 표시 폭을 Image sizes로 명시
 * 2026.08.28  임도헌   Modified  채팅 입력·이미지 업로드 핸들러 JSDoc 보강
 * 2026.09.06  임도헌   Modified  채팅 입력 영역 이미지 드롭과 파일 선택 검증 경로 통합
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
    imageUrl: string | null,
    imageIsAnimated: boolean,
    clientMessageId: string
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
  const pendingSubmissionRef = useRef<{
    fingerprint: string;
    clientMessageId: string;
  } | null>(null);

  /**
   * 모바일 액션 버튼을 누를 때 textarea 포커스가 먼저 빠지는 동작을 막는다.
   *
   * @param event - 액션 버튼에서 발생한 마우스 또는 포인터 이벤트
   */
  const preventFocusSteal = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  /** 액션 메뉴에서 이미지 파일 선택기를 열고 모바일 키보드를 정리한다. */
  const triggerPhotoSelect = () => {
    // 이미지 첨부는 미리보기 공간을 여는 흐름이라 모바일 키보드를 먼저 정리
    textareaRef.current?.blur();
    fileInputRef.current?.click();
  };

  /** 약속 제안 모달을 열기 전에 모바일 키보드를 닫는다. */
  const triggerAppointmentOpen = () => {
    textareaRef.current?.blur();
    onScheduleOpen?.();
  };

  /**
   * 이전 객체 URL을 해제하고 현재 이미지 미리보기 URL을 교체한다.
   *
   * @param nextPreviewUrl - 새 미리보기 URL 또는 초기화를 위한 null
   */
  const replacePreviewUrl = (nextPreviewUrl: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextPreviewUrl;
    setImagePreview(nextPreviewUrl);
  };

  /** 포인터가 정밀한 데스크톱 환경에서만 textarea 포커스를 복구한다. */
  const focusTextareaOnDesktop = () => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /**
   * 선택한 이미지를 전송 모드에 맞게 가공해 Cloudflare Images에 업로드한다.
   *
   * @param file - 사용자가 선택한 원본 이미지
   * @param mode - 최적화 또는 원본 업로드 모드
   */
  const uploadSelectedImage = async (file: File, mode: ChatImageUploadMode) => {
    setIsUploading(true);
    setUploadedUrl(null);
    setImageUploadMode(mode);

    try {
      const uploadFile = await prepareChatImageForUpload(file, mode);

      // 1) CF Upload URL 발급
      const res = await getUploadUrl("CHAT_IMAGE");
      if (!res.success) throw new Error("URL 발급 실패");

      // 2) 실제 업로드
      const fd = new FormData();
      fd.append("file", uploadFile);
      const uploadRes = await fetch(res.result.uploadURL, {
        method: "POST",
        body: fd,
      });
      if (!uploadRes.ok) throw new Error("업로드 실패");

      setUploadedUrl(res.result.deliveryUrl);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 파일 입력에서 선택한 이미지의 크기·형식을 검증하고 미리보기와 업로드를 시작한다.
   *
   * @param e - 이미지 파일 입력 변경 이벤트
   */
  const selectImageFile = async (file?: File) => {
    if (isUploading || isSubmitting || disabled) return;
    if (file && !file.type.startsWith("image/")) {
      toast.error("이미지 파일만 첨부할 수 있습니다.");
      return;
    }
    if (!file) return;
    let uploadSucceeded = false;

    // 용량 제한
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error(`이미지 크기는 ${MAX_PHOTO_SIZE_MB}MB를 초과할 수 없습니다.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      if (!originalImageFileRef.current && fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (uploadSucceeded) {
        focusTextareaOnDesktop();
      }
    }
  };

  /** 선택 이미지와 업로드 결과, 파일 입력 상태를 모두 초기화한다. */
  const removeImage = () => {
    replacePreviewUrl(null);
    setUploadedUrl(null);
    setImageIsAnimated(false);
    setImageUploadMode("optimized");
    originalImageFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** 선택한 원본 파일을 반대 화질 모드로 다시 업로드한다. */
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

  /**
   * 현재 텍스트와 이미지 정보를 멱등성 ID와 함께 제출하고 실패 시 입력을 복원한다.
   *
   * @param options - IME 조합 중 명시적 버튼 전송을 허용할지 여부
   */
  const submit = async (options?: { allowComposing?: boolean }) => {
    if (
      (!options?.allowComposing && isComposing) ||
      isSubmitting ||
      isUploading
    )
      return;
    const trimmed = text.trim();
    if (!trimmed && !uploadedUrl) return;
    const currentUrl = uploadedUrl;
    const currentPreview = imagePreview;
    const currentImageIsAnimated = imageIsAnimated;
    const fingerprint = JSON.stringify([
      trimmed,
      currentUrl,
      currentImageIsAnimated,
    ]);
    if (pendingSubmissionRef.current?.fingerprint !== fingerprint) {
      pendingSubmissionRef.current = {
        fingerprint,
        clientMessageId: crypto.randomUUID().replaceAll("-", ""),
      };
    }
    const clientMessageId = pendingSubmissionRef.current.clientMessageId;

    try {
      setText("");
      removeImage(); // 전송 시도 시 프리뷰 제거
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      await onSubmit(
        trimmed,
        currentUrl,
        currentImageIsAnimated,
        clientMessageId
      );
      pendingSubmissionRef.current = null;
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

  /**
   * 데스크톱 Enter 입력은 전송하고 Shift+Enter 및 모바일 Enter는 줄바꿈으로 유지한다.
   *
   * @param e - textarea 키보드 이벤트
   */
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
      className="w-full px-3 py-2 sm:px-4 flex flex-col gap-2"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void selectImageFile(event.dataTransfer.files[0]);
      }}
    >
      {/* 이미지 프리뷰 영역 */}
      {imagePreview && (
        <div className="flex items-start gap-3 px-1">
          <div className="relative size-20 rounded-xl overflow-hidden border border-border shadow-sm group">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              sizes="80px"
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
          onChange={(event) => {
            void selectImageFile(event.target.files?.[0]);
            event.target.value = "";
          }}
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
