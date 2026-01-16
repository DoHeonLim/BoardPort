/**
 * File Name : components/global/ImageUploader.tsx
 * Description : 이미지 업로드 컴포넌트 (시맨틱 토큰 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.10  임도헌   Created
 * 2024.12.10  임도헌   Modified  이미지 업로드 컴포넌트 추가
 * 2025.04.28  임도헌   Modified  이미지 업로드 로딩 상태 추가
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (다크모드 대응) 및 하드코딩 컬러 제거
 * 2026.01.16  임도헌   Moved     components/image -> components/global
 */
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
  onDeleteImage: (index: number) => void;
  onDragEnd: (result: DropResult) => void;
  isOpen: boolean;
  onToggle: () => void;
  maxImages?: number;
  isUploading?: boolean;
  optional?: boolean;
}

export default function ImageUploader({
  previews,
  onImageChange,
  onDeleteImage,
  onDragEnd,
  isOpen,
  onToggle,
  maxImages = 5,
  isUploading = false,
  optional = true,
}: ImageUploaderProps) {
  const handleImageClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (previews.length >= maxImages) {
      e.preventDefault();
      toast.warning(`이미지는 최대 ${maxImages}개만 가능합니다.`);
    }
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
              className={cn(
                "flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed transition-all",
                "bg-surface hover:bg-surface-dim",
                previews.length >= maxImages || isUploading
                  ? "cursor-not-allowed opacity-60 border-border"
                  : "cursor-pointer border-muted/40 hover:border-brand/50 hover:text-brand"
              )}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent"></div>
                  <div className="text-sm text-muted">이미지 업로드 중...</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted hover:text-brand dark:hover:text-brand-light transition-colors">
                  <PhotoIcon aria-label="photo_input" className="w-8 h-8" />
                  <div className="text-sm font-medium">
                    {previews.length >= maxImages
                      ? `최대 ${maxImages}장까지 업로드 가능합니다`
                      : "클릭하여 사진 추가"}
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
