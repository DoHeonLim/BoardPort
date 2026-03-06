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
 * 2026.02.15  임도헌   Modified  fetchPostsRaw에 지역(Region) 기반 디폴트 필터링 로직 추가
 * 2026.02.15  임도헌   Modified  카테고리별 지역 필터링 차별화 (정보성 글은 전국 기본)
 * 2026.02.20  임도헌   Modified  Hybrid Filtering 로직 명확화 및 JsDoc 개선
 * 2026.02.22  임도헌   Modified  글로벌 피드에서 정지된 유저(Banned)의 게시글 완벽 은닉
 * 2026.03.05  임도헌   Modified  `unstable_cache` 및 관련 `revalidateTag` 레거시 제거, TanStack Query용 순수 DB 페칭 로직으로 단일화
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  사용자 노출용 실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified  PostTag.count 정합성 및 정지 유저 mutation 가드 보강
 */
import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { POST_SELECT } from "@/features/post/constants";
import { POSTS_PAGE_TAKE } from "@/lib/constants";
import { badgeChecks, checkRuleSageBadge } from "@/features/user/service/badge";
import { getBlockedUserIds } from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import { buildRegionWhere } from "@/features/user/utils/region";
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
 * 게시글 검색 조건 쿼리 빌더
 *
 * [데이터 가공 전략]
 * - 커뮤니티 특성에 따라 지역 필터 적용 여부가 달라짐
 * - 지역성 카테고리 (CREW, FREE) : 유저의 DB 설정(RegionRange)에 따라 지역 필터를 적용
 * - 정보성 카테고리 (LOG, MAP, COMPASS) : 지역 필터 없이 전국(ALL) 단위로 조회
 *  - 정지 유저(bannedAt) 콘텐츠 은닉 필터 포함
 *
 * @param {PostSearchParams | undefined} params - 검색 조건
 * @param {number} viewerId - 조회자 ID
 * @returns {Promise<Prisma.PostWhereInput>} Prisma Where 조건 객체
 */
async function buildWhere(
  params: PostSearchParams | undefined,
  viewerId: number
): Promise<Prisma.PostWhereInput> {
  const keyword = params?.keyword;
  const category = params?.category;

  // DB에 저장된 유저의 범위 설정값 가져오기
  const user = await db.user.findUnique({
    where: { id: viewerId },
    select: { region1: true, region2: true, region3: true, regionRange: true },
  });

  const regionCondition = user ? buildRegionWhere(user) : {};

  return {
    AND: [
      { user: { bannedAt: null } }, // 정지된 유저의 게시글 숨김
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
      regionCondition,
    ],
  };
}

/**
 * 게시글 상세 정보 데이터 조회 로직
 *
 * [데이터 가공 전략]
 * - 유저 정보, 태그, 이미지 목록, 카운트(댓글, 좋아요) 등 연관 데이터 조인 조회
 * - 이미지 노출 순서(order) 기준 오름차순 정렬 반환
 *
 * @param {number} id - 게시글 ID
 */
export async function getPostDetail(id: number): Promise<PostDetail | null> {
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
    console.error("[getPostDetail] Error:", e);
    return null;
  }
}

/**
 * 게시글 상세 정보 캐시 Wrapper
 *
 * [캐시 제어 전략]
 * - `unstable_cache`를 활용한 서버 사이드 렌더링 캐시 적용
 * - `POST_DETAIL` 태그를 주입하여 생성/수정/삭제 시 On-demand 무효화 지원
 *
 * @param {number} id - 게시글 ID
 */
export const getCachedPost = (id: number) => {
  return nextCache(() => getPostDetail(id), ["post-detail-data", String(id)], {
    tags: [T.POST_DETAIL(id)],
    revalidate: 3600,
  })();
};

/**
 * 게시글 목록 조회 및 페이징 로직
 *
 * [데이터 페칭 및 가공 전략]
 * - 검색 조건(Where) 적용 및 커서 기반 페이지네이션 구현
 * - 조회자 ID(viewerId) 기준 차단된 유저의 게시글 은닉 처리
 * - 다음 페이지 존재 여부(nextCursor) 판별을 위해 LIMIT + 1 조회 적용
 *
 * @param {PostSearchParams | undefined} params - 검색 조건
 * @param {number} viewerId - 조회자 ID
 * @param {number | null} cursor - 페이지네이션 커서
 */
export async function getPostsList(
  params: PostSearchParams | undefined,
  viewerId: number,
  cursor: number | null = null
): Promise<PostsPage> {
  const where = await buildWhere(params, viewerId);

  // 차단 유저 필터링
  const blockedIds = await getBlockedUserIds(viewerId);
  if (blockedIds.length > 0) {
    where.userId = { notIn: blockedIds };
  }

  const rows = await db.post.findMany({
    where,
    select: POST_SELECT,
    orderBy: { created_at: "desc" },
    take: TAKE + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });

  const hasNextPage = rows.length > TAKE;
  const posts = hasNextPage ? rows.slice(0, TAKE) : rows;
  const nextCursor = hasNextPage ? posts[posts.length - 1].id : null;

  return { posts: posts as PostDetail[], nextCursor };
}

/* -------------------------------------------------------------------------- */
/*                                Write Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 게시글 생성
 *
 * [데이터 가공 및 캐시 제어 전략]
 * - 작성자의 정지 상태(bannedAt) 검증 및 차단 처리
 * - 본문, 태그, 다중 이미지, 위치 정보(Location)의 DB 트랜잭션 동시 저장 적용
 * - 비동기 방식을 활용한 게시글 등록 관련 뱃지 획득 조건 검사 수행
 *
 * @param {number} userId - 작성자 ID
 * @param {PostCreateDTO} data - 폼 입력 데이터 DTO
 */
export async function createPost(
  userId: number,
  data: PostCreateDTO
): Promise<ServiceResult<{ postId: number }>> {
  try {
    // 1. 정지 유저 체크
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    const nextTags = Array.from(new Set(data.tags));

    const post = await db.$transaction(async (tx) => {
      // 2. 게시글 본문 생성
      const newPost = await tx.post.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          user: { connect: { id: userId } },
          ...(data.location && {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            locationName: data.location.locationName,
            region1: data.location.region1,
            region2: data.location.region2,
            region3: data.location.region3,
          }),
        },
      });

      // 3. 태그 처리 (중복 시 카운트 증가)
      if (nextTags.length) {
        for (const tagName of nextTags) {
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

      // 4. 이미지 저장
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

    // 5. 뱃지 체크 (비동기)
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
    return {
      success: false,
      error:
        "게시글 등록에 실패했습니다. 입력 내용과 이미지 업로드 상태를 확인한 뒤 다시 시도해주세요.",
    };
  }
}

/**
 * 게시글 수정
 *
 * [데이터 가공 및 캐시 제어 전략]
 * - 게시글 소유자 권한 확인 후 비인가 변경 차단
 * - 트랜잭션을 통한 기존 태그/이미지 정보 초기화 및 신규 데이터 덮어쓰기 적용
 * - 위치 정보(Location) 삭제 또는 갱신 처리 병행
 *
 * @param {number} userId - 요청자 ID
 * @param {PostUpdateDTO} data - 수정 대상 폼 데이터 DTO
 */
export async function updatePost(
  userId: number,
  data: PostUpdateDTO
): Promise<ServiceResult<{ postId: number }>> {
  try {
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    // 1. 소유권 확인
    const existing = await db.post.findUnique({
      where: { id: data.id },
      select: { userId: true, tags: { select: { name: true } } },
    });
    if (!existing)
      return { success: false, error: "게시글을 찾을 수 없습니다." };
    if (existing.userId !== userId)
      return { success: false, error: "권한이 없습니다." };

    const prevTags = new Set(existing.tags.map((tag) => tag.name));
    const nextTags = Array.from(new Set(data.tags));
    const nextTagSet = new Set(nextTags);
    const removedTags = Array.from(prevTags).filter((tag) => !nextTagSet.has(tag));
    const addedTags = nextTags.filter((tag) => !prevTags.has(tag));

    // 위치 정보 업데이트 데이터 구성
    const locationUpdate = data.location
      ? {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          locationName: data.location.locationName,
          region1: data.location.region1,
          region2: data.location.region2,
          region3: data.location.region3,
        }
      : {
          latitude: null,
          longitude: null,
          locationName: null,
          region1: null,
          region2: null,
          region3: null,
        };

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
            connectOrCreate: nextTags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
          ...locationUpdate,
        },
      });

      if (removedTags.length) {
        await tx.postTag.updateMany({
          where: { name: { in: removedTags }, count: { gt: 0 } },
          data: { count: { decrement: 1 } },
        });
      }

      if (addedTags.length) {
        await Promise.all(
          addedTags.map((tagName) =>
            tx.postTag.upsert({
              where: { name: tagName },
              create: { name: tagName, count: 1 },
              update: { count: { increment: 1 } },
            })
          )
        );
      }

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
    return {
      success: false,
      error:
        "게시글 수정에 실패했습니다. 변경한 내용과 첨부 이미지를 확인한 뒤 다시 시도해주세요.",
    };
  }
}

/**
 * 게시글 삭제
 *
 * [데이터 가공 및 권한 제어 전략]
 * - 게시글 정보 조회 및 요청자와의 소유권 비교를 통한 권한 검증
 * - DB 참조 제약(Cascade)을 활용한 관련 데이터 일괄 물리 삭제(Hard Delete) 적용
 *
 * @param {number} userId - 요청자 ID
 * @param {number} postId - 게시글 ID
 */
export async function deletePost(
  userId: number,
  postId: number
): Promise<ServiceResult> {
  try {
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { userId: true, tags: { select: { name: true } } },
    });

    if (!post) return { success: false, error: "게시글을 찾을 수 없습니다." };
    if (post.userId !== userId)
      return { success: false, error: "권한이 없습니다." };

    await db.$transaction(async (tx) => {
      const tagNames = post.tags.map((tag) => tag.name);

      if (tagNames.length) {
        await tx.postTag.updateMany({
          where: { name: { in: tagNames }, count: { gt: 0 } },
          data: { count: { decrement: 1 } },
        });
      }

      await tx.post.delete({ where: { id: postId } });
    });
    return { success: true };
  } catch (error) {
    console.error("deletePost Error:", error);
    return {
      success: false,
      error:
        "게시글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
