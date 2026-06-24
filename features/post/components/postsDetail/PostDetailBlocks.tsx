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
 * 2026.04.10  임도헌   Modified  post 타이포 정책에 맞춰 임베드 카드 타이틀 weight를 500 기준으로 정리
 * 2026.04.14  임도헌   Modified  첫 이미지 블록에 우선 로드 힌트를 부여하고 유튜브 임베드는 썸네일 클릭 시점까지 지연
 * 2026.04.14  임도헌   Modified  첫 번째 미디어(이미지/임베드 썸네일)를 LCP 우선 자원으로 간주해 preload 힌트 전달
 */
"use client";

import ZoomableImage from "@/components/ui/ZoomableImage";
import type { PostBlock } from "@/features/post/types";
import PostDetailDescription from "@/features/post/components/postsDetail/PostDetailDescription";
import PostDetailEmbed from "@/features/post/components/postsDetail/PostDetailEmbed";
import PostDetailVideo from "@/features/post/components/postsDetail/PostDetailVideo";

interface PostDetailBlocksProps {
  blocks: PostBlock[];
}

/**
 * 게시글 상세에서 본문/미디어 블록 배열을 순서대로 렌더링
 * 현재는 TEXT / IMAGE / VIDEO / YOUTUBE EMBED를 지원
 */
export default function PostDetailBlocks({ blocks }: PostDetailBlocksProps) {
  if (!blocks.length) return null;
  const firstMediaBlockIndex = blocks.findIndex(
    (block) =>
      (block.type === "IMAGE" && !!block.postImage) ||
      (block.type === "EMBED" && !!block.embedThumbnailUrl)
  );

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, index) => {
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
                priority={index === firstMediaBlockIndex}
                fetchPriority={
                  index === firstMediaBlockIndex ? "high" : undefined
                }
                loading={index === firstMediaBlockIndex ? "eager" : "lazy"}
                sizes="(max-width: 640px) calc(100vw - 32px), 640px"
                quality={75}
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
            <PostDetailEmbed
              key={`post-block-embed-${block.id ?? block.order}`}
              title={block.embedTitle || "YouTube 영상"}
              embedUrl={block.embedUrl ?? ""}
              thumbnailUrl={block.embedThumbnailUrl ?? null}
              isPriority={index === firstMediaBlockIndex}
              sizes="(max-width: 640px) calc(100vw - 32px), 640px"
            />
          );
        }

        return null;
      })}
    </div>
  );
}
