/**
 * File Name : features/post/components/postCard/index.tsx
 * Description : 게시글 목록의 개별 카드 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 카드 컴포넌트 분리
 * 2025.07.04  임도헌   Modified   PostCard 컴포넌트 기능별 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 Card Contract 준수
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import Link from "next/link";
import { PostDetail } from "@/types/post";
import PostCardHeader from "@/features/post/components/postCard/PostCardHeader";
import PostCardMeta from "@/features/post/components/postCard/PostCardMeta";
import PostCardThumbnail from "@/features/post/components/postCard/PostCardThumbnail";
import PostCardTitle from "@/features/post/components/postCard/PostCardTitle";
import PostCardTags from "@/features/post/components/postCard/PostCardTag";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: PostDetail;
  viewMode: "list" | "grid";
}

export default function PostCard({ post, viewMode }: PostCardProps) {
  const isGrid = viewMode === "grid";

  return (
    <Link
      href={`/posts/${post.id}`}
      className={cn(
        "group relative flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand/30 dark:hover:border-brand-light/30",
        // List View 높이 축소: h-32 -> h-28 (112px), 패딩 p-3
        isGrid ? "flex-col h-full" : "flex-row h-28 w-full"
      )}
    >
      {/* 썸네일 */}
      <div className={cn("relative shrink-0", isGrid ? "w-full" : "h-full")}>
        <PostCardThumbnail images={post.images} viewMode={viewMode} />
      </div>

      {/* 정보 영역 */}
      <div
        className={cn(
          "flex flex-1 flex-col p-2 min-w-0",
          isGrid ? "justify-between gap-1" : "justify-between"
        )}
      >
        <div className="flex flex-col gap-0.5">
          <PostCardHeader category={post.category} />
          <PostCardTitle title={post.title} viewMode={viewMode} />
        </div>

        <div className="flex flex-col mt-auto">
          {!isGrid && <PostCardTags tags={post.tags} />}
          <PostCardMeta
            views={post.views}
            likes={post._count.post_likes}
            comments={post._count.comments}
            createdAt={post.created_at.toString()}
          />
        </div>
      </div>
    </Link>
  );
}
