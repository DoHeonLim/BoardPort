/**
 * File Name : components/global/ImageUploader.tsx
 * Description : 이미지 업로드 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.10  임도헌   Created
 * 2024.12.10  임도헌   Modified  이미지 업로드 컴포넌트 추가
 * 2025.04.28  임도헌   Modified  이미지 업로드 로딩 상태 추가
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (다크모드 대응) 및 하드코딩 컬러 제거
 * 2026.01.16  임도헌   Moved     components/image -> components/global
 * 2026.02.22  임도헌   Modified  Native Drag & Drop 시각적 피드백 구현
 * 2026.02.26  임도헌   Modified  드래그 시 다크모드 가시성 개선
 * 2026.03.08  임도헌   Modified  장식성 bounce 애니메이션 제거
 * 2026.05.30  임도헌   Modified  모바일 폼 밀도 조정을 위한 compact 표시 옵션 추가
 */

import { useId, useRef, useState } from "react";
import {
  PhotoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";
import type { DropResult } from "@hello-pangea/dnd";
import DraggableImageList from "./DraggableImageList";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImageUploaderProps {
  previews: string[];
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageDrop?: (event: React.DragEvent) => void;
  onDeleteImage: (index: number) => void;
  onDragEnd: (result: DropResult) => void;
  isOpen: boolean;
  onToggle: () => void;
  maxImages?: number;
  isUploading?: boolean;
  optional?: boolean;
  compact?: boolean;
}

/**
 * 이미지 업로드 컴포넌트
 *
 * 1. Native Input을 통한 파일 선택 및 Drag & Drop을 모두 지원
 * 2. 드래그 진입 시(`onDragOver`) 점선 테두리 강조로 시각적 피드백을 제공
 * 3. `useImageUpload` 훅과 연동하여 Blob URL 미리보기를 즉시 생성
 * 4. `@hello-pangea/dnd`를 사용하여 업로드된 이미지의 순서를 드래그로 변경 가능
 * 5. 실제 업로드 로직(Cloudflare Direct Upload)은 상위 폼 컴포넌트에서 수행
 */
export default function ImageUploader({
  previews,
  onImageChange,
  onImageDrop,
  onDeleteImage,
  onDragEnd,
  isOpen,
  onToggle,
  maxImages = 5,
  isUploading = false,
  optional = true,
  compact = false,
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const openFilePicker = () => {
    if (previews.length >= maxImages) {
      toast.warning(`이미지는 최대 ${maxImages}개만 가능합니다.`);
      return;
    }

    inputRef.current?.click();
  };

  // 드래그 진입
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (previews.length < maxImages && !isUploading) {
      setIsDragOver(true);
    }
  };

  // 드래그 이탈
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  // 드롭
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (previews.length >= maxImages || isUploading) return;
    onImageDrop?.(e);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "focus-ring-soft flex w-full items-center justify-between transition-colors hover:bg-surface-dim",
          compact ? "p-3.5 sm:p-4" : "p-4"
        )}
      >
        <div className="flex items-center gap-2">
          <PhotoIcon className="h-6 w-6 text-muted" />
          <span className="text-sm font-medium text-primary">
            이미지 추가{" "}
            {optional && (
              <span className="text-muted font-normal">(선택사항)</span>
            )}
            {previews.length > 0 && (
              <span className="ml-1 text-brand dark:text-brand-light">
                ({previews.length}/{maxImages})
              </span>
            )}
          </span>
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-muted" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-muted" />
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "border-t border-border bg-surface-dim/30",
            compact ? "p-3 sm:p-4" : "p-4"
          )}
        >
          <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}>
            <button
              type="button"
              onClick={openFilePicker}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              disabled={isUploading}
              className={cn(
                "focus-ring-soft flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all disabled:cursor-not-allowed",
                compact ? "h-28 sm:h-32" : "h-32",
                isDragOver
                  ? "border-brand bg-brand/5 dark:border-brand-light dark:bg-brand-light/10 scale-[1.01]"
                  : "bg-surface hover:bg-surface-dim border-muted/40 dark:border-neutral-600 hover:border-brand/50 dark:hover:border-brand-light/50 hover:text-brand dark:hover:text-brand-light",
                previews.length >= maxImages || isUploading
                  ? "cursor-not-allowed opacity-60 border-border bg-surface"
                  : "cursor-pointer"
              )}
            >
              {isUploading ? (
                <span className="flex flex-col items-center gap-2">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  <span className="text-sm text-muted">
                    이미지 업로드 중...
                  </span>
                </span>
              ) : (
                <span className="flex flex-col items-center gap-2 text-muted transition-colors">
                  <PhotoIcon
                    aria-hidden="true"
                    className={cn(
                      compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8",
                      isDragOver && "text-brand dark:text-brand-light"
                    )}
                  />
                  <span className="text-sm font-medium">
                    {previews.length >= maxImages
                      ? `최대 ${maxImages}장까지 업로드 가능합니다`
                      : isDragOver
                        ? "여기에 이미지를 놓으세요"
                        : "클릭 또는 드래그하여 사진 추가"}
                  </span>
                </span>
              )}
            </button>

            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/*"
              multiple
              onChange={onImageChange}
              className="hidden"
              disabled={isUploading || previews.length >= maxImages}
            />
          </div>

          {previews.length > 0 && (
            <DraggableImageList
              previews={previews}
              onDeleteImage={onDeleteImage}
              onDragEnd={onDragEnd}
            />
          )}
        </div>
      )}
    </div>
  );
}
