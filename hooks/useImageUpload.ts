/**
 * File Name : hooks/useImageUpload.ts
 * Description : 이미지 업로드를 위한 공통 커스텀 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.10  임도헌   Created   이미지 업로드 커스텀 훅 생성
 * 2024.12.10  임도헌   Modified  toast 기반 오류 처리 및 상태관리 추가
 * 2025.04.28  임도헌   Modified  toast UI로 변경
 * 2025.05.26  임도헌   Modified  .tsx → .ts 확장자 변경
 * 2025.06.15  임도헌   Modified  주석 추가
 */

import { useState } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { MAX_PHOTO_SIZE } from "@/lib/constants";
import { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";

interface UseImageUploadProps {
  maxImages?: number; // 최대 업로드 가능한 이미지 수
  maxSize?: number; // 개별 이미지 최대 크기 (기본 3MB)
  setValue: UseFormSetValue<any>; // react-hook-form의 setValue
  getValues: UseFormGetValues<any>; // react-hook-form의 getValues
}

/**
 * useImageUpload
 * 이미지 업로드를 위한 커스텀 훅으로, 다음과 같은 기능을 제공한다:
 * - 이미지 유효성 검증 (개수, 타입, 크기)
 * - 이미지 미리보기 URL 생성 및 상태 저장
 * - react-hook-form의 photos 필드와 연동
 * - 이미지 삭제 및 정렬 변경 기능 제공 (Drag & Drop 기반)
 */
export function useImageUpload({
  maxImages = 5,
  maxSize = MAX_PHOTO_SIZE,
  setValue,
  getValues,
}: UseImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]); // 이미지 미리보기 URL 배열
  const [files, setFiles] = useState<File[]>([]); // 업로드할 이미지 파일 배열
  const [isImageFormOpen, setIsImageFormOpen] = useState(false); // 이미지 업로드 폼 열림 여부
  const [isUploading, setIsUploading] = useState(false); // 업로드 중 상태

  /**
   * handleImageChange
   * - 이미지 선택 시 유효성 검증 후 미리보기 및 상태 업데이트
   */
  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { files: newFiles } = event.target;
    if (!newFiles) return;

    setIsUploading(true);
    try {
      if (previews.length + newFiles.length > maxImages) {
        toast.error(`이미지는 최대 ${maxImages}개까지만 업로드할 수 있습니다.`);
        event.target.value = "";
        return;
      }

      for (const file of Array.from(newFiles)) {
        if (!file.type.startsWith("image/")) {
          toast.error("이미지 파일만 업로드할 수 있습니다.");
          event.target.value = "";
          return;
        }
        if (file.size > maxSize) {
          toast.error("이미지는 3MB 이하로 올려주세요.");
          event.target.value = "";
          return;
        }
      }

      const newPreviews = Array.from(newFiles).map((file) =>
        URL.createObjectURL(file)
      );

      setPreviews((prev) => [...prev, ...newPreviews]);
      setFiles((prev) => [...prev, ...Array.from(newFiles)]);
      setValue("photos", [...(getValues("photos") || []), ...newPreviews]);
    } catch (error) {
      console.error(error);
      toast.error("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * handleDeleteImage
   * - 특정 인덱스의 이미지를 삭제하고 상태 동기화
   */
  const handleDeleteImage = (index: number) => {
    const currentPhotos: string[] = getValues("photos");
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setValue(
      "photos",
      currentPhotos.filter((_, i) => i !== index)
    );
  };

  /**
   * handleDragEnd
   * - Drag & Drop으로 이미지 순서를 변경할 때 실행
   */
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(previews);
    const fileItems = Array.from(files);

    const [reorderedPreview] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedPreview);

    const [reorderedFile] = fileItems.splice(result.source.index, 1);
    fileItems.splice(result.destination.index, 0, reorderedFile);

    setPreviews(items);
    setFiles(fileItems);
    setValue("photos", items);
  };

  /**
   * resetImage
   * - 이미지 상태 초기화
   */
  const resetImage = () => {
    setPreviews([]);
    setFiles([]);
    setValue("photos", []);
  };

  return {
    previews,
    files,
    isImageFormOpen,
    setIsImageFormOpen,
    handleImageChange,
    handleDeleteImage,
    handleDragEnd,
    isUploading,
    setPreviews,
    resetImage,
  };
}
