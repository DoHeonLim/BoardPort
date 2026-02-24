/**
 * File Name : features/post/components/postsDetail/index.tsx
 * Description : 게시글 상세 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   몰입형 Wave 디자인 적용
 * 2025.07.11  임도헌   Modified  게시글 상세 페이지 기능별로 컴포넌트 분리
 * 2025.11.13  임도헌   Modified  PostDetailTopbar 도입(뒤로가기+카테고리)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 배경색 및 패딩 조정
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.17  임도헌   Modified  PostDetailCarousel 컴포넌트 제거 후 Carousel 컴포넌트로 변경
 * 2026.01.22  임도헌   Modified  user 타입 정의 완화 (User -> UserLite)
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * ===============================================================================================
 * PostDetail (게시글 상세) 페이지를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 *
 * - PostDetailTopbar.tsx      : 상단바 (뒤로가기, 카테고리 칩, 수정 버튼)
 * - PostDetailTitle.tsx       : 게시글 제목
 * - PostDetailDescription.tsx : 게시글 본문 내용
 * - PostDetailMeta.tsx        : 작성일, 조회수, 좋아요 버튼 등 메타 정보
 * - index.tsx                 : 위 컴포넌트들을 조합하고 애니메이션/댓글 섹션을 포함한 최종 컨테이너
 * ===============================================================================================
 */
"use client";

import { PostDetail as PostDetailType } from "@/features/post/types";
import { motion } from "framer-motion";
import Carousel from "@/components/ui/Carousel";
import PostDetailTitle from "@/features/post/components/postsDetail/PostDetailTitle";
import PostDetailDescription from "@/features/post/components/postsDetail/PostDetailDescription";
import StaticMap from "@/features/map/components/StaticMap";
import PostDetailMeta from "@/features/post/components/postsDetail/PostDetailMeta";
import PostDetailTopbar from "@/features/post/components/postsDetail/PostDetailTopbar";
import PostComment from "@/features/post/components/postComment";

interface UserLite {
  id: number;
  username: string;
  avatar: string | null;
}

interface PostDetailProps {
  post: PostDetailType;
  user: UserLite;
  likeCount: number;
  isLiked: boolean;
}

/**
 * 게시글 상세 페이지 컨테이너
 *
 * [구조]
 * 1. 상단바 (Topbar)
 * 2. 본문 영역 (제목 -> 설명 -> 이미지 캐러셀 -> 메타 정보)
 * 3. 댓글 섹션 (PostComment)
 *
 * Framer Motion을 사용하여 본문 영역에 진입 애니메이션 적용
 */
export default function PostDetail({
  post,
  user,
  likeCount,
  isLiked,
}: PostDetailProps) {
  const canEdit = post.user.id === user.id;

  // 주소 문자열 조합
  const regionString = [post.region1, post.region2, post.region3]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative min-h-screen bg-background transition-colors pb-20">
      {/* Topbar section */}
      <PostDetailTopbar
        postId={post.id}
        title={post.title}
        authorId={post.user.id}
        authorUsername={post.user.username}
        authorAvatar={post.user.avatar}
        category={post.category}
        canEdit={canEdit}
        editHref={`/posts/${post.id}/edit`}
      />

      {/* Contents section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-page-x py-6 space-y-6"
      >
        <PostDetailTitle title={post.title} />

        <PostDetailDescription description={post.description} />

        {/* 장소 태그 (있을 때만 표시) */}
        {post.latitude && post.longitude && post.locationName && (
          <div className="mt-6 mb-2">
            <StaticMap
              latitude={post.latitude}
              longitude={post.longitude}
              locationName={post.locationName}
              regionString={regionString}
            />
          </div>
        )}

        {post.images.length > 0 && (
          <div className="relative aspect-video w-full overflow-hidden mt-6 rounded-2xl shadow-sm bg-surface-dim border border-border">
            <Carousel images={post.images} className="w-full h-full" />
          </div>
        )}

        <div className="border-t border-border pt-4">
          <PostDetailMeta
            postId={post.id}
            isLiked={isLiked}
            likeCount={likeCount}
            views={post.views}
            createdAt={post.created_at?.toString() ?? ""}
          />
        </div>

        {/* Comment section */}
        <section className="pt-4">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="text-xl">💬</span> 항해 로그
          </h3>
          <PostComment postId={post.id} user={user} />
        </section>
      </motion.div>
    </div>
  );
}
