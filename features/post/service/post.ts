/**
 * File Name : features/post/service/post.ts
 * Description : 게시글 관리 비즈니스 로직 (CRUD)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.23  임도헌   Created
 * 2024.11.23  임도헌   Modified  동네생활 게시글 생성 코드 추가
 * 2024.12.10  임도헌   Modified  이미지 여러개 업로드 코드 추가
 * 2025.03.02  임도헌   Modified  게시글 작성시 게시글 추가 관련 뱃지 체크 추가
 * 2025.03.29  임도헌   Modified  checkBoardExplorerBadge 기능 추가
 * 2025.07.04  임도헌   Modified  게시글 생성 액션 분리 및 리팩토링
 * 2025.12.07  임도헌   Modified  게시글 관련 뱃지 체크를 badgeChecks/onPostCreate + RULE_SAGE로 정리
 * 2026.01.03  임도헌   Modified  게시글 생성 후 POST_LIST 태그 및 /posts 경로 무효화로 목록 즉시 최신화
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 * 2026.01.22  임도헌   Merged    lib/createPost.ts 기반으로 조회/수정/삭제 로직 통합 및 Session 의존성 제거
 * 2026.01.27  임도헌   Modified  주석 보강
 */
import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { POST_SELECT } from "@/features/post/constants";
import { POSTS_PAGE_TAKE } from "@/lib/constants";
import { badgeChecks, checkRuleSageBadge } from "@/features/user/service/badge";
import type { ServiceResult } from "@/lib/types";
import type {
  PostDetail,
  PostsPage,
  PostCreateDTO,
  PostUpdateDTO,
  PostSearchParams,
} from "@/features/post/types";

const TAKE = POSTS_PAGE_TAKE;

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 게시글 검색 조건 쿼리 빌더 (Internal Helper)
 * 키워드(제목/설명/태그) 및 카테고리 필터를 조합하여 Prisma Where 조건을 생성합니다.
 *
 * @param params - 검색 파라미터 객체
 */
function buildWhere(params?: PostSearchParams): Prisma.PostWhereInput {
  if (!params) return {};
  const { keyword, category } = params;
  return {
    AND: [
      keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { description: { contains: keyword } },
              { tags: { some: { name: { contains: keyword } } } },
            ],
          }
        : {},
      category ? { category } : {},
    ],
  };
}

/**
 * 게시글 상세 정보를 DB에서 조회합니다. (Internal)
 */
const getPostById = async (id: number): Promise<PostDetail | null> => {
  try {
    const post = await db.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true, post_likes: true } },
        images: { orderBy: { order: "asc" } },
        tags: true,
      },
    });
    return post as PostDetail | null;
  } catch (e) {
    console.error("[getPostById] Error:", e);
    return null;
  }
};

/**
 * 게시글 상세 조회 캐시 Wrapper
 * - 태그: POST_DETAIL(id), POST_VIEWS(id)
 *
 * @param {number} id - 게시글 ID
 */
export const getCachedPost = (id: number) => {
  return nextCache(() => getPostById(id), ["post-detail", String(id)], {
    tags: [T.POST_DETAIL(id), T.POST_VIEWS(id)],
  })();
};

/**
 * 게시글 목록을 DB에서 조회합니다. (Internal)
 * 초기 로딩/검색/무한 스크롤 등 모든 목록 조회에 사용됩니다.
 */
async function fetchPostsRaw(
  params?: PostSearchParams,
  cursor?: number | null
): Promise<PostsPage> {
  const where = buildWhere(params);

  const posts = await db.post.findMany({
    where,
    select: POST_SELECT,
    orderBy: { created_at: "desc" },
    take: TAKE + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });

  const hasNextPage = posts.length > TAKE;
  const paginatedPosts = hasNextPage ? posts.slice(0, TAKE) : posts;
  const nextCursor = hasNextPage
    ? paginatedPosts[paginatedPosts.length - 1].id
    : null;

  return { posts: paginatedPosts as PostDetail[], nextCursor };
}

/**
 * 초기 게시글 목록 조회 (Cached)
 * - 필터가 없는 초기 로딩이나 특정 검색어의 첫 페이지를 캐싱합니다.
 * - 태그: POST_LIST
 *
 * @param {PostSearchParams} params - 검색 파라미터
 */
export const getCachedInitialPosts = (params?: PostSearchParams) => {
  const key = params
    ? `search:${params.keyword ?? ""}|${params.category ?? ""}`
    : "all";
  return nextCache(() => fetchPostsRaw(params, null), ["post-list", key], {
    tags: [T.POST_LIST()],
  })();
};

/**
 * 게시글 목록 추가 로드 (Non-Cached)
 * - 무한 스크롤 시 커서를 기반으로 다음 데이터를 실시간 조회합니다.
 *
 * @param {number | null} cursor - 마지막 게시글 ID
 * @param {PostSearchParams} params - 검색 파라미터
 */
export const getMorePosts = async (
  cursor: number | null,
  params?: PostSearchParams
) => {
  return fetchPostsRaw(params, cursor);
};

/* -------------------------------------------------------------------------- */
/*                                Write Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 게시글 생성
 * - 게시글 저장, 태그 연결, 이미지 저장을 트랜잭션으로 처리합니다.
 * - 생성 후 관련 뱃지를 체크합니다. (Fire & Forget)
 *
 * @param {number} userId - 작성자 ID
 * @param {PostCreateDTO} data - 게시글 생성 데이터
 * @returns {Promise<ServiceResult<{ postId: number }>>} 생성된 게시글 ID
 */
export async function createPost(
  userId: number,
  data: PostCreateDTO
): Promise<ServiceResult<{ postId: number }>> {
  try {
    const post = await db.$transaction(async (tx) => {
      // 1. 게시글 본문 생성
      const newPost = await tx.post.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          user: { connect: { id: userId } },
        },
      });

      // 2. 태그 처리 (중복 시 카운트 증가)
      if (data.tags.length) {
        for (const tagName of data.tags) {
          const tag = await tx.postTag.upsert({
            where: { name: tagName },
            create: { name: tagName, count: 1 },
            update: { count: { increment: 1 } },
          });
          await tx.post.update({
            where: { id: newPost.id },
            data: { tags: { connect: { id: tag.id } } },
          });
        }
      }

      // 3. 이미지 저장
      if (data.photos.length) {
        await Promise.all(
          data.photos.map((url, index) =>
            tx.postImage.create({
              data: {
                url,
                order: index,
                post: { connect: { id: newPost.id } },
              },
            })
          )
        );
      }
      return newPost;
    });

    // 4. 뱃지 체크 (비동기)
    const badgeTasks: Promise<any>[] = [
      badgeChecks.onPostCreate(userId),
      badgeChecks.onEventParticipation(userId),
    ];
    if (data.category === "MAP") {
      badgeTasks.push(checkRuleSageBadge(userId));
    }
    await Promise.allSettled(badgeTasks);

    return { success: true, data: { postId: post.id } };
  } catch (error) {
    console.error("createPost Error:", error);
    return { success: false, error: "게시글 생성 중 오류가 발생했습니다." };
  }
}

/**
 * 게시글 수정
 * - 소유권을 확인하고 기존 이미지/태그를 정리한 뒤 업데이트합니다.
 *
 * @param {number} userId - 요청자(작성자) ID
 * @param {PostUpdateDTO} data - 수정할 데이터
 */
export async function updatePost(
  userId: number,
  data: PostUpdateDTO
): Promise<ServiceResult<{ postId: number }>> {
  try {
    // 1. 소유권 확인
    const existing = await db.post.findUnique({
      where: { id: data.id },
      select: { userId: true },
    });
    if (!existing)
      return { success: false, error: "게시글을 찾을 수 없습니다." };
    if (existing.userId !== userId)
      return { success: false, error: "권한이 없습니다." };

    // 2. 트랜잭션 업데이트
    await db.$transaction(async (tx) => {
      // 기존 이미지/태그 초기화 (덮어쓰기 전략)
      await tx.postImage.deleteMany({ where: { postId: data.id } });
      await tx.post.update({
        where: { id: data.id },
        data: { tags: { set: [] } },
      });

      // 기본 정보 및 태그 업데이트
      await tx.post.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          tags: {
            connectOrCreate: data.tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        },
      });

      // 새 이미지 저장
      if (data.photos.length) {
        await Promise.all(
          data.photos.map((url, index) =>
            tx.postImage.create({
              data: {
                url,
                order: index,
                post: { connect: { id: data.id } },
              },
            })
          )
        );
      }
    });

    return { success: true, data: { postId: data.id } };
  } catch (error) {
    console.error("updatePost Error:", error);
    return { success: false, error: "게시글 수정에 실패했습니다." };
  }
}

/**
 * 게시글 삭제
 *
 * @param {number} userId - 요청자 ID
 * @param {number} postId - 삭제할 게시글 ID
 */
export async function deletePost(
  userId: number,
  postId: number
): Promise<ServiceResult> {
  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) return { success: false, error: "게시글을 찾을 수 없습니다." };
    if (post.userId !== userId)
      return { success: false, error: "권한이 없습니다." };

    await db.post.delete({ where: { id: postId } });
    return { success: true };
  } catch (error) {
    console.error("deletePost Error:", error);
    return { success: false, error: "삭제 중 오류가 발생했습니다." };
  }
}
