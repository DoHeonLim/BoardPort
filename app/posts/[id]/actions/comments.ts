/**
 * File Name : app/posts/[id]/actions/comments
 * Description : 게시글 댓글 관련 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   댓글 관련 서버 액션 분리
 * 2025.07.11  임도헌   Modified  댓글 무한 스크롤 구현
 * 2025.11.20  임도헌   Modified  revalidate 태그 네이밍 통일
 * 2025.12.07  임도헌   Modified  조회 전용으로 정리(getComments/getCachedComments만 사용)
 */
"use server";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import { PostComment } from "@/types/post";
import * as T from "@/lib/cacheTags";

// 게시글 댓글 목록 조회
export const getComments = async (
  postId: number,
  cursor?: number,
  limit = 10
) => {
  const rawComments = await db.comment.findMany({
    where: { postId },
    take: limit,
    skip: cursor ? 1 : 0, // 커서 중복 방지
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      payload: true,
      created_at: true,
      userId: true,
      user: {
        select: { username: true, avatar: true },
      },
    },
  });

  return rawComments as PostComment[];
};

// 게시글 댓글 목록 캐싱 함수
export const getCachedComments = (postId: number): Promise<PostComment[]> => {
  const cachedOperation = nextCache(
    getComments,
    ["post-comments", String(postId)],
    {
      tags: [T.POST_COMMENTS(postId)],
    }
  );
  return cachedOperation(postId);
};

// createComment / deleteComment 는 더 이상 사용하지 않으므로 제거
// 댓글 생성/삭제는 lib/post/comment/create/delete 를 통해서만 동작하도록 통일.
