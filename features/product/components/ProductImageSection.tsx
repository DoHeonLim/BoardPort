/**
 * File Name : features/product/components/ProductImageSection.tsx
 * Description : 제품 폼 이미지 업로드 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ProductForm의 이미지 업로드 블록을 분리해 섹션 역할을 명확화
 */

import ImageUploader from "@/components/global/ImageUploader";
import type { DropResult } from "@hello-pangea/dnd";

interface ProductImageSectionProps {
  previews: string[];
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageDrop: (event: React.DragEvent) => void;
  handleDeleteImage: (index: number) => void;
  handleDragEnd: (result: DropResult) => void;
  isImageFormOpen: boolean;
  setIsImageFormOpen: (value: boolean) => void;
  isUploading: boolean;
  maxImages: number;
  mode: "create" | "edit";
  photoErrorMessage?: string;
}

/**
 * 제품 대표/상세 이미지 업로드 섹션
 *
 * [역할]
 * - 업로드 UI와 안내 문구를 본문 폼에서 분리해 이미지 관련 책임을 한곳에 모은다
 * - create 모드의 최소 1장 요구사항과 서버 검증 오류 문구를 함께 노출
 */
export default function ProductImageSection({
  previews,
  handleImageChange,
  handleImageDrop,
  handleDeleteImage,
  handleDragEnd,
  isImageFormOpen,
  setIsImageFormOpen,
  isUploading,
  maxImages,
  mode,
  photoErrorMessage,
}: ProductImageSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-primary">상품 이미지</label>
      <ImageUploader
        previews={previews}
        onImageChange={handleImageChange}
        onImageDrop={handleImageDrop}
        onDeleteImage={handleDeleteImage}
        onDragEnd={handleDragEnd}
        isOpen={isImageFormOpen}
        onToggle={() => setIsImageFormOpen(!isImageFormOpen)}
        isUploading={isUploading}
        optional={false}
      />
      <p className="pl-1 text-xs leading-relaxed text-muted/80">
        최대 {maxImages}장까지 업로드할 수 있으며, 각 이미지는 10MB까지 첨부할
        수 있습니다. 첫 번째 이미지가 대표 이미지로 표시됩니다.
      </p>
      {photoErrorMessage ? (
        <p className="pl-1 text-xs text-danger">{photoErrorMessage}</p>
      ) : previews.length === 0 && mode === "create" ? (
        <p className="pl-1 text-xs text-danger">
          * 최소 1개 이상의 이미지를 업로드해주세요.
        </p>
      ) : null}
    </div>
  );
}
