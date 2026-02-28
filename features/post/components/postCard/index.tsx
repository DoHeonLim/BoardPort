/**
 * File Name : features/post/components/postCard/index.tsx
 * Description : 게시글 목록의 개별 카드 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 카드 컴포넌트 분리
 * 2025.07.04  임도헌   Modified  PostCard 컴포넌트 기능별 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 Card Contract 준수
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.15  임도헌   Modified  PostCardMeta에 region 정보 전달
 * 2026.02.26  임도헌   Modified  PostCardTag에서 PostCardTags로 import 수정
 * 2026.02.28  임도헌   Modified  태그 유무와 상관없이 메타 정보를 바닥에 고정하도록 구조 개선
 * ===============================================================================================
 * PostCard (게시글 카드) 컴포넌트를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * 각 컴포넌트는 게시글 정보를 보여주는 카드에서 특정 부분의 렌더링을 담당:
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
import PostCardTags from "@/features/post/components/postCard/PostCardTags";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: PostDetail;
  viewMode: "list" | "grid";
}

/**
 * 게시글 카드 (PostCard)
 *
 * - 목록(List) 및 그리드(Grid) 뷰 모드를 지원
 * - 썸네일, 헤더(카테고리), 제목, 태그, 메타 정보를 조합하여 렌더링
 * - 클릭 시 게시글 상세 페이지(`/posts/[id]`)로 이동
 */
export default function PostCard({ post, viewMode }: PostCardProps) {
  const isGrid = viewMode === "grid";

  return (
    <Link
      href={`/posts/${post.id}`}
      className={cn(
        "group relative flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand/30 dark:hover:border-brand-light/30",
        isGrid ? "flex-col h-full" : "flex-row h-28 sm:h-36 w-full"
      )}
    >
      {/* 썸네일 */}
      <div className={cn("relative shrink-0", isGrid ? "w-full" : "h-full")}>
        <PostCardThumbnail images={post.images} viewMode={viewMode} />
      </div>

      {/* 2. 정보 영역 (flex-col flex-1) */}
      <div className="flex flex-1 flex-col p-2 min-w-0">
        {/* 상단: 카테고리 + 제목 */}
        <div className="flex flex-col gap-0.5">
          <PostCardHeader category={post.category} />
          <PostCardTitle title={post.title} viewMode={viewMode} />
        </div>

        {/* 중단: 태그 영역 (공간을 채워 메타 정보를 아래로 밀어냄) */}
        <div className="flex-1 flex items-center min-h-0">
          {!isGrid && post.tags.length > 0 && <PostCardTags tags={post.tags} />}
        </div>

        {/* 하단: 메타 정보 (mt-auto로 바닥 고정) */}
        <div className="mt-auto pt-1">
          <PostCardMeta
            views={post.views}
            likes={post._count.post_likes}
            comments={post._count.comments}
            createdAt={post.created_at.toString()}
            region2={post.region2}
            region3={post.region3}
            viewMode={viewMode}
          />
        </div>
      </div>
    </Link>
  );
}
