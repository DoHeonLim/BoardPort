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
 */

import { useState } from "react";
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
}

/**
 * 이미지 업로드 컴포넌트
 *
 * 1. Native Input을 통한 파일 선택 및 Drag & Drop을 모두 지원
 * 2. 드래그 진입 시(`onDragOver`) 점선 테두리 강조로 시각적 피드백을 제공함.
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
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleImageClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (previews.length >= maxImages) {
      e.preventDefault();
      toast.warning(`이미지는 최대 ${maxImages}개만 가능합니다.`);
    }
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
    <div className="flex flex-col gap-2 border border-border rounded-xl overflow-hidden bg-surface transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between p-4 w-full hover:bg-surface-dim transition-colors"
      >
        <div className="flex items-center gap-2">
          <PhotoIcon className="w-6 h-6 text-muted" />
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
          <ChevronUpIcon className="w-5 h-5 text-muted" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-muted" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-border bg-surface-dim/30">
          <div className="flex flex-col gap-4">
            <label
              htmlFor={previews.length >= maxImages ? undefined : "photo"}
              onClick={handleImageClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed transition-all",
                // 드래그 상태에 따른 스타일 분기
                isDragOver
                  ? "border-brand bg-brand/5 scale-[1.01]"
                  : "bg-surface hover:bg-surface-dim border-muted/40 hover:border-brand/50 hover:text-brand",
                previews.length >= maxImages || isUploading
                  ? "cursor-not-allowed opacity-60 border-border bg-surface"
                  : "cursor-pointer"
              )}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent"></div>
                  <div className="text-sm text-muted">이미지 업로드 중...</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted transition-colors">
                  <PhotoIcon
                    aria-label="photo_input"
                    className={cn(
                      "w-8 h-8",
                      isDragOver && "text-brand animate-bounce"
                    )}
                  />
                  <div className="text-sm font-medium">
                    {previews.length >= maxImages
                      ? `최대 ${maxImages}장까지 업로드 가능합니다`
                      : isDragOver
                      ? "여기에 이미지를 놓으세요"
                      : "클릭 또는 드래그하여 사진 추가"}
                  </div>
                </div>
              )}
            </label>

            <input
              id="photo"
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
