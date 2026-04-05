/**
 * File Name : features/post/hooks/usePostImageBlocks.ts
 * Description : 게시글 블록 에디터에서 사용하는 이미지 블록 상태/첨부 처리 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.31  임도헌   Created   PostForm에서 이미지 블록 자산 상태와 드래그/첨부 처리 로직 분리
 * 2026.03.31  임도헌   Modified  초기 자산 복원, 다중 선택 시 연속 IMAGE 블록 생성 흐름 주석 보강
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MAX_PHOTO_SIZE } from "@/lib/constants";
import type { PostEditorBlock } from "@/features/post/types";
import {
  createImageEditorBlock,
  type ImageBlockAsset,
} from "@/features/post/utils/editor";

interface UsePostImageBlocksOptions {
  initialImageBlockAssets: Record<string, ImageBlockAsset>;
  editorBlocks: PostEditorBlock[];
  setEditorBlocks: React.Dispatch<React.SetStateAction<PostEditorBlock[]>>;
  maxImages: number;
  scrollToBlock: (blockId: string) => void;
}

/**
 * 게시글 블록 에디터에서 이미지 자산 상태와 첨부 상호작용을 관리합니다.
 * 이미지 블록별 교체/비우기, 드래그 앤 드롭, 다중 선택 시 연속 IMAGE 블록 생성까지 포함합니다.
 */
export function usePostImageBlocks({
  initialImageBlockAssets,
  editorBlocks,
  setEditorBlocks,
  maxImages,
  scrollToBlock,
}: UsePostImageBlocksOptions) {
  const [imageBlockAssets, setImageBlockAssets] = useState<
    Record<string, ImageBlockAsset>
  >(initialImageBlockAssets);

  // 수정 모드 또는 reset 이후 이미지 자산 복원
  useEffect(() => {
    setImageBlockAssets(initialImageBlockAssets);
  }, [initialImageBlockAssets]);

  // 단일 이미지 블록 자산 교체
  const updateImageBlockAsset = (blockId: string, file: File) => {
    if (!file.type.startsWith("image/") || file.type === "image/x-icon") {
      toast.error("jpg, png, webp, gif 형식의 이미지만 첨부할 수 있습니다.");
      return false;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("이미지 크기는 10MB 이하만 첨부할 수 있습니다.");
      return false;
    }

    const previous = imageBlockAssets[blockId];
    if (previous?.preview.startsWith("blob:")) {
      URL.revokeObjectURL(previous.preview);
    }

    const preview = URL.createObjectURL(file);
    setImageBlockAssets((prev) => ({
      ...prev,
      [blockId]: {
        preview,
        sourceUrl: null,
        file,
        isAnimated: file.type === "image/gif",
      },
    }));

    return true;
  };

  // 이미지 자산 제거
  const removeImageBlockAsset = (blockId: string) => {
    setImageBlockAssets((prev) => {
      const next = { ...prev };
      const target = next[blockId];
      if (target?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      delete next[blockId];
      return next;
    });
  };

  // 이미지 파일 선택/드롭 처리
  // 첫 파일은 현재 블록에 배치하고, 나머지는 연속 IMAGE 블록으로 이어 붙이는 구조
  const handleImageBlockFiles = (blockId: string, selectedFiles: File[]) => {
    if (!selectedFiles.length) return;

    const currentImageBlocks = editorBlocks.filter(
      (block) => block.type === "IMAGE"
    ).length;
    const maxSelectableCount = maxImages - currentImageBlocks + 1;
    const files = selectedFiles.slice(0, Math.max(maxSelectableCount, 0));

    if (!files.length) {
      toast.warning(`이미지는 최대 ${maxImages}장까지 첨부할 수 있습니다.`);
      return;
    }

    if (selectedFiles.length > files.length) {
      toast.warning(`이미지는 최대 ${maxImages}장까지만 배치할 수 있습니다.`);
    }

    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/") || file.type === "image/x-icon") {
        toast.error("jpg, png, webp, gif 형식의 이미지만 첨부할 수 있습니다.");
        continue;
      }

      if (file.size > MAX_PHOTO_SIZE) {
        toast.error("이미지 크기는 10MB 이하만 첨부할 수 있습니다.");
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) return;

    updateImageBlockAsset(blockId, validFiles[0]);

    if (validFiles.length > 1) {
      const nextBlocks = validFiles.slice(1).map(() => createImageEditorBlock());

      nextBlocks.forEach((block, index) => {
        updateImageBlockAsset(block.id, validFiles[index + 1]);
      });

      setEditorBlocks((prev) => {
        const targetIndex = prev.findIndex((block) => block.id === blockId);
        if (targetIndex === -1) return prev;

        const next = [...prev];
        next.splice(targetIndex + 1, 0, ...nextBlocks);
        return next;
      });

      scrollToBlock(nextBlocks[nextBlocks.length - 1].id);
    }
  };

  // 이미지 input change 처리
  const handleImageBlockChange = (
    blockId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    handleImageBlockFiles(blockId, selectedFiles);
    event.target.value = "";
  };

  // 이미지 drag & drop 처리
  const handleImageBlockDrop = (
    blockId: string,
    event: React.DragEvent<HTMLDivElement | HTMLButtonElement>
  ) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    handleImageBlockFiles(blockId, droppedFiles);
  };

  // reset 이후 이미지 자산 복원
  const resetImageBlockAssets = (
    nextAssets: Record<string, ImageBlockAsset> = initialImageBlockAssets
  ) => {
    setImageBlockAssets(nextAssets);
  };

  return {
    imageBlockAssets,
    removeImageBlockAsset,
    handleImageBlockChange,
    handleImageBlockDrop,
    resetImageBlockAssets,
  };
}
