/**
 * File Name : components/post/postsDetail/index
 * Description : 게시글 상세 페이지 Wrapper
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   몰입형 Wave 디자인 적용
 * 2025.07.11  임도헌   Modified  게시글 상세 페이지 기능별로 컴포넌트 분리
 * 2025.11.13  임도헌   Modified  PostDetailTopbar 도입(뒤로가기+카테고리)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 배경색 및 패딩 조정
 */
"use client";

import { PostDetail } from "@/types/post";
import { User } from "@/generated/prisma/client";
import { motion } from "framer-motion";
import PostDetailTitle from "./PostDetailTitle";
import PostDetailDescription from "./PostDetailDescription";
import PostDetailCarousel from "./PostDetailCarousel";
import PostDetailMeta from "./PostDetailMeta";
import PostComment from "../postComment/PostComment";
import PostDetailTopbar from "./PostDetailTopbar";

interface PostDetailWrapperProps {
  post: PostDetail;
  user: User;
  likeCount: number;
  isLiked: boolean;
}

export default function PostDetailWrapper({
  post,
  user,
  likeCount,
  isLiked,
}: PostDetailWrapperProps) {
  const canEdit = post.user.id === user.id; // 숫자 PK 비교

  return (
    <div className="relative min-h-screen bg-background transition-colors pb-20">
      {/* Topbar section */}
      <PostDetailTopbar
        category={post.category}
        backHref="/posts"
        authorUsername={post.user.username}
        authorAvatar={post.user.avatar}
        canEdit={canEdit}
        editHref={canEdit ? `/posts/${post.id}/edit` : undefined}
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

        {post.images.length > 0 && <PostDetailCarousel images={post.images} />}

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
