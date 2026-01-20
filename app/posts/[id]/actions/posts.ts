/**
 * File Name : app/posts/[id]/actions/posts
 * Description : 게시글 조회 및 삭제 관련 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   게시글 관련 서버 액션 분리
 * 2025.11.20  임도헌   Modified  조회수 증가 로직 캐시에서 분리, revalidate 태그/경로 정리
 * 2026.01.02  임도헌   Modified  getCachedPost 캐시 wrapper 고정(prefix) + 호출 시점 태그 주입 방식으로 정리
 * 2026.01.03  임도헌   Modified  게시글 삭제 후 POST_DETAIL + POST_LIST 무효화 및 /posts 경로 무효화로 목록 즉시 반영
 * 2026.01.03  임도헌   Modified  getCachedPost 구독 태그에 POST_VIEWS 추가(상세 정합성)
 * 2026.01.04  임도헌   Modified  incrementPostViews wrapper 제거 → page에서 lib/views/incrementViews 직접 호출로 단일 진입점 고정
 */

"use server";

import "server-only";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { notFound } from "next/navigation";
import {
  revalidateTag,
  unstable_cache as nextCache,
  revalidatePath,
} from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 게시글 상세 조회 (순수 쿼리, 부수효과 없음)
 */
export const getPost = async (id: number) => {
  try {
    return await db.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            post_likes: true,
          },
        },
        images: {
          orderBy: { order: "asc" },
        },
        tags: true,
      },
    });
  } catch (e) {
    console.error(e);
    return null;
  }
};

/**
 * 게시글 상세 캐시 wrapper
 * - 호출 시점에 postId 기반 tag 주입
 */
export const getCachedPost = async (postId: number) => {
  const cached = nextCache(
    async () => getPost(postId),
    ["post-detail", String(postId)],
    {
      tags: [T.POST_DETAIL(postId), T.POST_VIEWS(postId)],
    }
  );

  return cached();
};

/**
 * 게시글 삭제
 */
export async function deletePost(postId: number) {
  const session = await getSession();
  if (!session?.id) return notFound();

  if (!Number.isFinite(postId) || postId <= 0) return notFound();

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!post) return notFound();
  if (post.userId !== session.id) return notFound();

  await db.post.delete({ where: { id: postId } });

  // 상세/목록 캐시 및 경로 무효화
  revalidateTag(T.POST_DETAIL(postId));
  revalidateTag(T.POST_LIST());
  revalidatePath("/posts");
}

/**
 * 현재 로그인한 사용자 정보 조회
 * - 미들웨어 로그인 강제를 신뢰하더라도, SSR에서 안전하게 notFound 처리한다.
 */
export const getUser = async () => {
  const session = await getSession();
  if (session?.id) {
    const user = await db.user.findUnique({ where: { id: session.id } });
    if (user) return user;
  }
  return notFound();
};
