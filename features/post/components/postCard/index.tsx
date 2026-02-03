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
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * ===============================================================================================
 * 이 폴더는 PostCard (게시글 카드) 컴포넌트를 구성하는 UI 요소들을 분리해 모아둔 디렉토리입니다.
 * 각 컴포넌트는 게시글 정보를 보여주는 카드에서 특정 부분의 렌더링을 담당합니다:
 *
 * - PostCardHeader.tsx    : 게시글 카테고리 뱃지 표시
 * - PostCardTitle.tsx     : 게시글 제목 표시 (리스트/그리드 모드 지원)
 * - PostCardThumbnail.tsx : 게시글 썸네일 이미지 표시
 * - PostCardMeta.tsx      : 조회수, 좋아요, 댓글 수, 작성 시간 표시
 * - PostCardTag.tsx       : 게시글 태그 목록 표시
 * - index.tsx             : 위 컴포넌트들을 조합한 최종 PostCard
 * ===============================================================================================
 */
"use client";

import Link from "next/link";
import { PostDetail } from "@/features/post/types";
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

/**
 * 게시글 카드 (PostCard)
 *
 * - 목록(List) 및 그리드(Grid) 뷰 모드를 지원합니다.
 * - 썸네일, 헤더(카테고리), 제목, 태그, 메타 정보를 조합하여 렌더링합니다.
 * - 클릭 시 게시글 상세 페이지(`/posts/[id]`)로 이동합니다.
 */
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
