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
 * 2026.03.12  임도헌   Modified  업로드 이미지의 애니메이션 여부를 photosAnimated 필드와 동기화하는 옵션 추가
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
  syncAnimatedFlags?: boolean;
}

/**
 * 이미지 업로드 상태/검증/정렬 관리 훅
 *
 * - 파일 선택/드롭 입력의 공통 검증 처리
 * - 미리보기 URL과 원본 File 상태 동기화
 * - react-hook-form `photos`/`photosAnimated` 필드 연동
 * - Drag & Drop 기반 순서 재정렬 지원
 *
 * @param {UseImageUploadProps} props - 업로드 제한값과 form 상태 연동 설정
 * @returns {object} 미리보기 상태와 업로드/삭제/정렬 핸들러 묶음
 */
export function useImageUpload({
  maxImages = 5,
  maxSize = MAX_PHOTO_SIZE,
  setValue,
  getValues,
  syncAnimatedFlags = false,
}: UseImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [animatedFlags, setAnimatedFlags] = useState<boolean[]>([]);
  const [isImageFormOpen, setIsImageFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * 입력/드롭 공통 파일 처리
   */
  const processFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setIsUploading(true);
    try {
      // 업로드 개수 제한 검증
      if (previews.length + newFiles.length > maxImages) {
        toast.error(`이미지는 최대 ${maxImages}개까지만 업로드할 수 있습니다.`);
        return;
      }

      const validFiles: File[] = [];

      for (const file of newFiles) {
        // 이미지 타입 검증
        if (!file.type.startsWith("image/")) {
          toast.error("이미지 파일만 업로드할 수 있습니다.");
          return;
        }

        // Cloudflare Images 미지원 ico 차단
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

        // 개별 파일 용량 검증
        if (file.size > maxSize) {
          toast.error("이미지는 3MB 이하로 올려주세요.");
          return;
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      // 미리보기 URL 및 애니메이션 플래그 계산
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      const newAnimatedFlags = validFiles.map(
        (file) => file.type === "image/gif"
      );

      setPreviews((prev) => [...prev, ...newPreviews]);
      setFiles((prev) => [...prev, ...validFiles]);
      setAnimatedFlags((prev) => {
        const next = [...prev, ...newAnimatedFlags];
        if (syncAnimatedFlags) {
          setValue("photosAnimated", next, { shouldDirty: true });
        }
        return next;
      });

      // RHF 사진 필드 동기화
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
    event.target.value = "";
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
   * 특정 인덱스 이미지 제거
   */
  const handleDeleteImage = (index: number) => {
    const currentPhotos: string[] = getValues("photos");
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setAnimatedFlags((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (syncAnimatedFlags) {
        setValue("photosAnimated", next, { shouldDirty: true });
      }
      return next;
    });
    setValue(
      "photos",
      currentPhotos.filter((_, i) => i !== index)
    );
  };

  /**
   * 드래그 종료 후 순서 재정렬
   */
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(previews);
    const fileItems = Array.from(files);
    const flagItems = Array.from(animatedFlags);

    const [reorderedPreview] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedPreview);

    const [reorderedFile] = fileItems.splice(result.source.index, 1);
    fileItems.splice(result.destination.index, 0, reorderedFile);

    const [reorderedFlag] = flagItems.splice(result.source.index, 1);
    flagItems.splice(result.destination.index, 0, reorderedFlag);

    setPreviews(items);
    setFiles(fileItems);
    setAnimatedFlags(flagItems);
    setValue("photos", items);
    if (syncAnimatedFlags) {
      setValue("photosAnimated", flagItems, { shouldDirty: true });
    }
  };

  /**
   * 이미지 상태 초기화 (Reset)
   */
  const resetImage = () => {
    setPreviews([]);
    setFiles([]);
    setAnimatedFlags([]);
    setValue("photos", []);
    if (syncAnimatedFlags) {
      setValue("photosAnimated", []);
    }
  };

  return {
    previews,
    files,
    animatedFlags,
    setAnimatedFlags,
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
