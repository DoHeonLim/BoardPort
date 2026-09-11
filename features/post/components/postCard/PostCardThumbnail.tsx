/**
 * File Name : features/post/components/postCard/PostCardThumbnail.tsx
 * Description : 게시글 썸네일 이미지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created   썸네일 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 No Image UI 개선
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.28  임도헌   Modified  썸네일 크기 미세 조정
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드에서는 썸네일 높이를 낮춰 정보 영역 비율을 균형화
 * 2026.03.12  임도헌   Modified  사용자 업로드 GIF만 썸네일 최적화 예외 처리하도록 이미지 메타 연동
 * 2026.03.23  임도헌   Modified  썸네일과 본문 사이의 구조 구분선 성격에 맞게 카드 분할 보더를 subtle 기준으로 정리
 * 2026.03.26  임도헌   Modified  리스트 카드 모바일 썸네일 폭을 미세 조정해 텍스트 가시 영역을 확보
 * 2026.04.08  임도헌   Modified  게시글 카드 대표 썸네일을 첫 미디어 블록(이미지/유튜브 임베드) 우선 규칙으로 정리
 * 2026.04.14  임도헌   Modified  첫 게시글 카드만 priority/fetchPriority를 적용해 목록 LCP를 개선
 * 2026.04.14  임도헌   Modified  유튜브 썸네일도 Next 이미지 최적화를 통과시키고 sizes를 모바일 실폭 기준으로 보정
 * 2026.09.11  임도헌   Modified  Cloudflare Images public variant 중복 방지
 * 2026.09.11  임도헌   Modified  대표 썸네일 판별 분리와 무이미지 placeholder 복구
 * 2026.09.11  임도헌   Modified  Next.js 16 기준 LCP 이미지 eager 로딩 전환
 */
"use client";

import Image from "next/image";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { PostBlock, PostImage } from "@/features/post/types";
import { parseYouTubeEmbedInput } from "@/features/post/utils/embed";
import { toPostImagePublicUrl } from "@/features/post/utils/image";

interface PostCardThumbnailProps {
  thumbnail: PostCardThumbnailData | null;
  viewMode: "list" | "grid";
  isPriority?: boolean;
}

export interface PostCardThumbnailData {
  src: string;
  isAnimated: boolean;
}

/** 게시글 블록과 이미지 목록에서 카드 대표 썸네일 정보 추출 */
export function getPostCardThumbnail(
  images: PostImage[],
  blocks: PostBlock[] = []
): PostCardThumbnailData | null {
  const firstMediaBlock = blocks.find(
    (block) =>
      (block.type === "IMAGE" && !!block.postImage?.url) ||
      (block.type === "EMBED" &&
        !!(
          block.embedThumbnailUrl ||
          parseYouTubeEmbedInput(block.embedUrl)?.thumbnailUrl
        ))
  );
  const selectedEmbedThumbnail =
    firstMediaBlock?.type === "EMBED"
      ? (firstMediaBlock.embedThumbnailUrl ??
        parseYouTubeEmbedInput(firstMediaBlock.embedUrl)?.thumbnailUrl ??
        null)
      : null;

  if (firstMediaBlock?.type === "IMAGE" && firstMediaBlock.postImage?.url) {
    const src = toPostImagePublicUrl(firstMediaBlock.postImage.url);
    if (src) {
      return {
        src,
        isAnimated: !!firstMediaBlock.postImage.isAnimated,
      };
    }
  }

  if (firstMediaBlock?.type === "EMBED" && selectedEmbedThumbnail) {
    return { src: selectedEmbedThumbnail, isAnimated: false };
  }

  if (images[0]?.url) {
    const src = toPostImagePublicUrl(images[0].url);
    if (src) {
      return {
        src,
        isAnimated: !!images[0].isAnimated,
      };
    }
  }

  return null;
}

/**
 * 게시글의 대표 이미지를 렌더링
 * - 첫 미디어 블록이 이미지면 해당 이미지를 대표 썸네일로 사용
 * - 첫 미디어 블록이 유튜브 임베드면 임베드 썸네일을 대표 썸네일로 사용
 * - 블록 정보로 대표 썸네일을 정하지 못할 때만 기존 images[0]을 fallback으로 사용
 * - 뷰 모드에 따라 적절한 레이아웃과 sizes 속성을 적용
 */
export default function PostCardThumbnail({
  thumbnail,
  viewMode,
  isPriority = false,
}: PostCardThumbnailProps) {
  const isGrid = viewMode === "grid";
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-dim border-r border-border-subtle shrink-0",
        isGrid
          ? "aspect-[3/2] w-full rounded-t-xl border-b sm:aspect-[4/3]"
          : "h-full w-28 sm:w-32"
      )}
    >
      {thumbnail ? (
        <Image
          src={thumbnail.src}
          alt="게시글 썸네일"
          fill
          fetchPriority={isPriority ? "high" : undefined}
          loading={isPriority ? "eager" : "lazy"}
          sizes={
            isGrid
              ? "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
              : "(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px"
          }
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized={thumbnail.isAnimated}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted/50">
          <PhotoIcon className="size-7 sm:size-8" aria-hidden="true" />
          <span className="sr-only">대표 이미지 없음</span>
        </div>
      )}
    </div>
  );
}
