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
 */
"use client";

import Image from "next/image";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { PostImage } from "@/features/post/types";

interface PostCardThumbnailProps {
  images: PostImage[];
  viewMode: "list" | "grid";
}

/**
 * 게시글의 대표 이미지를 렌더링합니다.
 * - 이미지가 있으면 첫 번째 이미지를 표시합니다.
 * - 이미지가 없으면 Placeholder 아이콘을 표시합니다.
 * - 뷰 모드에 따라 적절한 레이아웃과 sizes 속성을 적용합니다.
 */
export default function PostCardThumbnail({
  images,
  viewMode,
}: PostCardThumbnailProps) {
  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-dim border-r border-border shrink-0",
        // List View 너비: sm 이상에선 w-28, 모바일(기본)에선 w-24로 살짝 줄임 (높이는 부모 h-full을 따름)
        isGrid
          ? "aspect-[4/3] w-full rounded-t-xl border-b"
          : "w-20 sm:w-28 h-full"
      )}
    >
      {images[0] ? (
        <Image
          src={`${images[0].url}/public`}
          alt="게시글 썸네일"
          fill
          sizes={
            isGrid
              ? "(max-width: 640px) 100vw, (max-width: 768px) 50vw"
              : "120px"
          }
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted/40">
          <PhotoIcon className="size-6 sm:size-8" />
        </div>
      )}
    </div>
  );
}
