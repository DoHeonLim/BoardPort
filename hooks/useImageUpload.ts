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
 * 2026.01.25  임도헌   Modified  .ico 파일 업로드 차단 및 에러 메세지 구체화
 * 2026.02.02  임도헌   Modified  주석 보강
 * 2026.02.23  임도헌   Modified  Native Drag & Drop 지원을 위한 로직 분리 및 핸들러 추가
 */

import { useState } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { MAX_PHOTO_SIZE } from "@/lib/constants";
import { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";

interface UseImageUploadProps {
  maxImages?: number; // 최대 업로드 가능한 이미지 수 (기본: 5)
  maxSize?: number; // 개별 이미지 최대 크기 (기본: 3MB)
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
}

/**
 * 이미지 업로드 관리 훅
 *
 * 1. 파일 선택(Input) 및 드롭(Drop) 시 유효성 검증(타입, 크기, 개수)을 수행
 * 2. 선택된 이미지의 미리보기(Blob URL)를 생성하고 상태를 관리
 * 3. react-hook-form의 `photos` 필드와 상태를 동기화
 * 4. Drag & Drop(`@hello-pangea/dnd`)을 통한 이미지 순서 변경을 지원
 *
 * @param props - 설정값 및 Form 핸들러
 */
export function useImageUpload({
  maxImages = 5,
  maxSize = MAX_PHOTO_SIZE,
  setValue,
  getValues,
}: UseImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]); // 이미지 미리보기 URL 배열
  const [files, setFiles] = useState<File[]>([]); // 업로드할 실제 File 객체 배열
  const [isImageFormOpen, setIsImageFormOpen] = useState(false); // 업로드 UI 토글 상태
  const [isUploading, setIsUploading] = useState(false); // 업로드 진행 중 여부

  /**
   * 공통 파일 처리 로직
   * - Input Change와 Drag Drop에서 공통으로 사용
   */
  const processFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setIsUploading(true);
    try {
      // 1. 개수 제한 검사
      if (previews.length + newFiles.length > maxImages) {
        toast.error(`이미지는 최대 ${maxImages}개까지만 업로드할 수 있습니다.`);
        return;
      }

      const validFiles: File[] = [];

      for (const file of newFiles) {
        // 2. 파일 타입 검사 (이미지만 허용)
        if (!file.type.startsWith("image/")) {
          toast.error("이미지 파일만 업로드할 수 있습니다.");
          return;
        }

        // 3. .ico 파일 차단 (Cloudflare Images 미지원)
        if (
          file.type === "image/x-icon" ||
          file.type === "image/vnd.microsoft.icon" ||
          file.name.toLowerCase().endsWith(".ico")
        ) {
          toast.error(
            ".ico 파일은 지원하지 않습니다. (jpg, png, webp 등 사용)"
          );
          return;
        }

        // 4. 용량 제한 검사
        if (file.size > maxSize) {
          toast.error("이미지는 3MB 이하로 올려주세요.");
          return;
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      // 5. 미리보기 생성 및 상태 업데이트
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));

      setPreviews((prev) => [...prev, ...newPreviews]);
      setFiles((prev) => [...prev, ...validFiles]);

      // RHF 필드 동기화 (기존 값 + 새 값)
      setValue("photos", [...(getValues("photos") || []), ...newPreviews]);
    } catch (error) {
      console.error(error);
      toast.error("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 이미지 파일 선택 핸들러 (Input Change)
   */
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;

    processFiles(Array.from(fileList));
    event.target.value = ""; // 동일 파일 재선택 가능하도록 초기화
  };

  /**
   * 이미지 드롭 핸들러 (Native Drag & Drop)
   */
  const handleImageDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const fileList = event.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;

    processFiles(Array.from(fileList));
  };

  /**
   * 이미지 삭제 핸들러
   * - 특정 인덱스의 이미지를 미리보기 목록과 파일 목록에서 제거
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
   * 드래그 앤 드롭 종료 핸들러 (순서 변경)
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
   * 이미지 상태 초기화 (Reset)
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
    handleImageDrop,
    handleDeleteImage,
    handleDragEnd,
    isUploading,
    setPreviews,
    resetImage,
  };
}
