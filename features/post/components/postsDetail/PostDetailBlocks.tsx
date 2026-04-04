/**
 * File Name : features/post/components/postsDetail/PostDetailBlocks.tsx
 * Description : 게시글 상세용 본문/미디어 블록 렌더러
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   PostBlock 2차 확장 대비 blocks 우선 렌더링 레이어 추가
 * 2026.03.31  임도헌   Modified  블록 에디터 도입 이후 현재 지원 블록 렌더링 문맥에 맞춰 주석 정리
 * 2026.03.31  임도헌   Modified  IMAGE 블록을 캐러셀 대신 단일 이미지 확대 뷰어로 전환
 * 2026.03.31  임도헌   Modified  유튜브 전용 EMBED 블록 렌더링 추가
 */
"use client";

import ZoomableImage from "@/components/ui/ZoomableImage";
import type { PostBlock } from "@/features/post/types";
import PostDetailDescription from "@/features/post/components/postsDetail/PostDetailDescription";
import PostDetailVideo from "@/features/post/components/postsDetail/PostDetailVideo";
import { LinkIcon } from "@heroicons/react/24/outline";

interface PostDetailBlocksProps {
  blocks: PostBlock[];
}

/**
 * 게시글 상세에서 본문/미디어 블록 배열을 순서대로 렌더링
 * 현재는 TEXT / IMAGE / VIDEO / YOUTUBE EMBED를 지원
 */
export default function PostDetailBlocks({ blocks }: PostDetailBlocksProps) {
  if (!blocks.length) return null;

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => {
        if (block.type === "TEXT") {
          return (
            <PostDetailDescription
              key={`post-block-text-${block.id ?? block.order}`}
              description={block.textContent}
            />
          );
        }

        if (block.type === "IMAGE" && block.postImage) {
          return (
            <div
              key={`post-block-image-${block.id ?? block.order}`}
              className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-dim shadow-sm"
            >
              <ZoomableImage
                src={`${block.postImage.url}/public`}
                alt={`게시글 이미지 ${block.order + 1}`}
                isAnimated={!!block.postImage.isAnimated}
                className="h-full w-full"
              />
            </div>
          );
        }

        if (block.type === "VIDEO" && block.postVideo) {
          return (
            <PostDetailVideo
              key={`post-block-video-${block.id ?? block.order}`}
              video={block.postVideo}
            />
          );
        }

        if (block.type === "EMBED") {
          return (
            <div
              key={`post-block-embed-${block.id ?? block.order}`}
              className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
                <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light">
                  <LinkIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">
                    {block.embedTitle || "YouTube 영상"}
                  </p>
                </div>
              </div>
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={block.embedUrl ?? ""}
                  title={block.embedTitle || "YouTube 영상"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
