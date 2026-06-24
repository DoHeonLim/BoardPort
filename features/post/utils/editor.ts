/**
 * File Name : features/post/utils/editor.ts
 * Description : 게시글 블록 에디터에서 재사용하는 순수 헬퍼 모음
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.31  임도헌   Created   PostForm에서 분리한 블록 생성/초기화/본문 추출 헬퍼 정리
 * 2026.03.31  임도헌   Modified  블록 복원과 초기 편집기 구성 목적이 드러나도록 JSDoc 보강
 * 2026.03.31  임도헌   Modified  유튜브 전용 EMBED 블록 생성 및 초기 복원 헬퍼 추가
 */

import type { PostBlock, PostEditorBlock } from "@/features/post/types";

export interface ImageBlockAsset {
  preview: string;
  sourceUrl?: string | null;
  file?: File | null;
  isAnimated: boolean;
}

/** 텍스트 블록 초기값 생성 */
export function createTextEditorBlock(text = ""): PostEditorBlock {
  return {
    id: `text-${crypto.randomUUID()}`,
    type: "TEXT",
    textContent: text,
  };
}

/** 이미지 블록 초기값 생성 */
export function createImageEditorBlock(): PostEditorBlock {
  return {
    id: `image-${crypto.randomUUID()}`,
    type: "IMAGE",
  };
}

/** 유튜브 임베드 블록 초기값 생성 */
export function createEmbedEditorBlock(url = ""): PostEditorBlock {
  return {
    id: `embed-${crypto.randomUUID()}`,
    type: "EMBED",
    embedUrl: url,
  };
}

/**
 * 편집기 초기 블록 배열 계산
 * 저장된 blocks가 있으면 그대로 복원하고, 없으면 최소 TEXT 블록 하나로 편집기를 시작합니다.
 */
export function deriveInitialEditorBlocks(
  description: string,
  initialBlocks?: PostBlock[]
): PostEditorBlock[] {
  if (initialBlocks?.length) {
    const editorBlocks: PostEditorBlock[] = [];

    for (const block of initialBlocks) {
      if (block.type === "TEXT") {
        editorBlocks.push({
          id: `block-${block.id ?? editorBlocks.length}`,
          type: "TEXT",
          textContent: block.textContent ?? "",
        });
      } else if (
        block.type === "VIDEO" &&
        !editorBlocks.some((item) => item.type === "VIDEO")
      ) {
        editorBlocks.push({
          id: `block-${block.id ?? editorBlocks.length}`,
          type: "VIDEO",
        });
      } else if (block.type === "IMAGE") {
        editorBlocks.push({
          id: `block-${block.id ?? editorBlocks.length}`,
          type: "IMAGE",
        });
      } else if (block.type === "EMBED") {
        editorBlocks.push({
          id: `block-${block.id ?? editorBlocks.length}`,
          type: "EMBED",
          embedProvider: block.embedProvider ?? undefined,
          embedUrl: block.embedUrl ?? "",
          embedTitle: block.embedTitle ?? undefined,
          embedThumbnailUrl: block.embedThumbnailUrl ?? undefined,
        });
      }
    }

    return editorBlocks.length ? editorBlocks : [createTextEditorBlock(description)];
  }

  return [createTextEditorBlock(description)];
}

/**
 * 저장용 본문 문자열 계산
 * description 검색/미리보기 필드와의 동기화를 위해 TEXT 블록만 추려 하나의 문자열로 합칩니다.
 */
export function getDescriptionFromEditorBlocks(blocks: PostEditorBlock[]): string {
  return blocks
    .filter((block) => block.type === "TEXT")
    .map((block) => block.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 초기 이미지 자산 매핑
 * 저장된 photos/animated 정보를 현재 IMAGE 블록 순서에 맞춰 편집기용 자산으로 복원합니다.
 */
export function deriveInitialImageBlockAssets(
  blocks: PostEditorBlock[],
  photos: string[],
  photosAnimated: boolean[]
): Record<string, ImageBlockAsset> {
  const assets: Record<string, ImageBlockAsset> = {};
  let imageIndex = 0;

  for (const block of blocks) {
    if (block.type !== "IMAGE") continue;

    const sourceUrl = photos[imageIndex];
    if (sourceUrl) {
      assets[block.id] = {
        preview: `${sourceUrl}/public`,
        sourceUrl,
        file: null,
        isAnimated: photosAnimated[imageIndex] ?? false,
      };
    }
    imageIndex += 1;
  }

  return assets;
}
