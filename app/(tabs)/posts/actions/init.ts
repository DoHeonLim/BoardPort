/**
 * File Name : app/(tabs)/posts/actions/init
 * Description : 항해일지 페이지 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.06  임도헌   Created
 * 2025.05.06  임도헌   Modified  게시글 페이지 액션 추가
 * 2025.06.26  임도헌   Created   게시글 초기 로딩 및 무한 스크롤 처리
 * 2025.07.04  임도헌   Modified  getMorePosts에 searchParams 추가
 * 2025.07.04  임도헌   Modified  전체 액션 커서 처리 통일
 * 2025-09-02  임도헌   Modified  TAKE 상수 POSTS_PAGE_TAKE로 변경
 * 2026.01.03  임도헌   Modified  posts 초기 1페이지/검색 결과를 POST_LIST 태그 기반 캐시로 전환(무효화 즉시 반영)
 * 2026.01.03  임도헌   Modified  getMorePosts는 비캐시 유지(커서/검색 조합 폭발 방지)
 */
"use server";

import db from "@/lib/db";
import { POST_SELECT } from "@/features/post/lib/constants";
import { Posts } from "@/types/post";
import {
  getPostSearchCondition,
  PostSearchParams,
} from "@/features/post/lib/queries";
import { POSTS_PAGE_TAKE } from "@/lib/constants";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

const TAKE = POSTS_PAGE_TAKE;

export const fetchPosts = async (
  searchParams?: PostSearchParams,
  cursor?: number | null
): Promise<Posts> => {
  const where = searchParams ? getPostSearchCondition(searchParams) : undefined;

  const posts = await db.post.findMany({
    where,
    select: POST_SELECT,
    orderBy: { created_at: "desc" },
    take: TAKE + 1,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
  });

  const hasNextPage = posts.length > TAKE;
  const paginatedPosts = hasNextPage ? posts.slice(0, TAKE) : posts;
  const nextCursor = hasNextPage
    ? paginatedPosts[paginatedPosts.length - 1].id
    : null;

  return { posts: paginatedPosts, nextCursor };
};

/** 초기 1페이지(검색 포함) 전용 캐시: tags=[POST_LIST] */
const getCachedInitialPosts = (searchParams?: PostSearchParams) => {
  const key = searchParams
    ? `search:${searchParams.keyword ?? ""}|${searchParams.category ?? ""}`
    : "all";

  const cached = nextCache(
    async () => fetchPosts(searchParams, null),
    ["post-list-initial", key],
    {
      tags: [T.POST_LIST()],
      revalidate: 60,
    }
  );

  return cached();
};

export const getInitialPosts = async (): Promise<Posts> => {
  return getCachedInitialPosts();
};

export const getMorePosts = async (
  cursor: number | null,
  searchParams: Record<string, string>
): Promise<Posts> => {
  // 무한스크롤은 비캐시(커서/파라미터 조합 폭발 방지)
  return fetchPosts(searchParams, cursor);
};

/** 검색도 초기 1페이지 캐시를 그대로 사용 */
export const getInitialPostsBySearch = async (
  params: PostSearchParams
): Promise<Posts> => {
  return getCachedInitialPosts(params);
};
