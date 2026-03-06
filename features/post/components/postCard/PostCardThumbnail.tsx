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
 * 게시글의 대표 이미지를 렌더링
 * - 이미지가 있으면 첫 번째 이미지를 표시
 * - 이미지가 없으면 Placeholder 아이콘을 표시
 * - 뷰 모드에 따라 적절한 레이아웃과 sizes 속성을 적용
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
        isGrid
          ? "aspect-[3/2] w-full rounded-t-xl border-b sm:aspect-[4/3]"
          : "w-32 h-full"
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
