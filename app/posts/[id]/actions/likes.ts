/**
 * File Name : app/posts/[id]/actions/likes
 * Description : 게시글 좋아요 관련 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   좋아요 관련 서버 액션 분리
 * 2025.11.20  임도헌   Modified  revalidate 태그 네이밍 통일
 * 2026.01.03  임도헌   Modified  좋아요/취소 후 POST_LIKE_STATUS 외 POST_DETAIL/POST_LIST도 무효화하여 카운트 즉시 동기화
 */
"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import {
  checkBoardExplorerBadge,
  checkPopularWriterBadge,
} from "@/features/user/lib/badges";
import { revalidateTag, unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

// 게시글 좋아요 상태 조회
export const getLikeStatus = async (postId: number, userId: number) => {
  const isLiked = await db.postLike.findUnique({
    where: { id: { postId, userId } },
  });
  const likeCount = await db.postLike.count({ where: { postId } });
  return { likeCount, isLiked: Boolean(isLiked) };
};

//좋아요 상태 캐싱 함수
export const getCachedLikeStatus = async (postId: number) => {
  const session = await getSession();
  if (!session?.id) return { likeCount: 0, isLiked: false };

  const cachedOperation = nextCache(
    getLikeStatus,
    ["post-like-status", String(postId)],
    {
      tags: [T.POST_LIKE_STATUS(postId)],
    }
  );

  return cachedOperation(postId, session.id);
};

// 게시글에 좋아요 추가
export const likePost = async (postId: number) => {
  const session = await getSession();
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });
  if (!post) return;

  await db.postLike.create({
    data: { postId, userId: session.id! },
  });

  await checkPopularWriterBadge(post.userId);
  await checkBoardExplorerBadge(post.userId);
  revalidateTag(T.POST_LIKE_STATUS(postId));
  revalidateTag(T.POST_DETAIL(postId));
  revalidateTag(T.POST_LIST());
};

// 게시글 좋아요 취소
export const dislikePost = async (postId: number) => {
  const session = await getSession();
  await db.postLike.delete({
    where: { id: { postId, userId: session.id! } },
  });
  revalidateTag(T.POST_LIKE_STATUS(postId));
  revalidateTag(T.POST_DETAIL(postId));
  revalidateTag(T.POST_LIST());
};
