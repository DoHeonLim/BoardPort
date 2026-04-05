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
 * 2026.03.12  임도헌   Modified  게시글 이미지 저장 시 애니메이션 메타를 함께 기록
 * 2026.03.14  임도헌   Modified  게시글 무한스크롤 첫 페이지에 totalCount를 함께 반환해 총 게시글 수를 고정 표시
 * 2026.03.30  임도헌   Modified  게시글 동영상 초안(draftKey) 연결 및 상세 video 메타 조회 추가
 * 2026.03.30  임도헌   Modified  PostBlock 2차 확장 대비 상세 blocks 조회 추가
 * 2026.03.30  임도헌   Modified  기본 TEXT/VIDEO/IMAGE PostBlock 저장 로직 추가
 * 2026.03.31  임도헌   Modified  draft video 연결과 PostBlock 동기화 내부 헬퍼 설명 보강
 * 2026.03.31  임도헌   Modified  레거시 description/video/images 기반 PostBlock fallback 제거
 * 2026.03.31  임도헌   Modified  유튜브 전용 EMBED 블록 저장 로직 추가
 * 2026.04.02  임도헌   Modified  게시글 서비스 export/helper JSDoc 태그 형식 정리
 */
import "server-only";

import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { POST_SELECT } from "@/features/post/selects";
import { POSTS_PAGE_TAKE } from "@/lib/constants";
import { badgeChecks, checkRuleSageBadge } from "@/features/user/service/badge";
import { getBlockedUserIds } from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import { buildRegionWhere } from "@/features/user/utils/region";
import { deleteCloudflareStreamAsset } from "@/features/post/service/video";
import type { ServiceResult } from "@/lib/types";
import type {
  PostEditorBlock,
  PostDetail,
  PostsPage,
  PostCreateDTO,
  PostUpdateDTO,
  PostSearchParams,
} from "@/features/post/types";

const TAKE = POSTS_PAGE_TAKE;

/**
 * 게시글 생성/수정 시 연결되지 않은 동영상 초안을 실제 게시글 자산으로 연결
 * 같은 게시글에 이미 연결된 다른 동영상은 정리하고, 선택된 초안만 PROCESSING 상태로 승격
 *
 * @param {Prisma.TransactionClient} tx - 게시글 저장 트랜잭션 클라이언트
 * @param {number} userId - 초안 업로드 요청 사용자 ID
 * @param {number} postId - 동영상을 연결할 게시글 ID
 * @param {string | null} [draftKey] - 연결할 draft video 식별자
 * @returns {Promise<string[]>} 정리 대상이 된 이전 동영상 자산 UID 목록
 */
async function attachDraftVideoToPost(
  tx: Prisma.TransactionClient,
  userId: number,
  postId: number,
  draftKey?: string | null
): Promise<string[]> {
  const removedAssetUids: string[] = [];

  if (!draftKey) return removedAssetUids;

  // draftKey와 userId를 함께 확인해 다른 사용자의 업로드 초안 연결 방지
  const draftVideo = await tx.postVideo.findFirst({
    where: { draftKey, userId },
    select: { id: true },
  });

  if (!draftVideo) {
    throw new Error("연결할 게시글 동영상 초안을 찾을 수 없습니다.");
  }

  // 게시글당 동영상 1개 정책 유지
  const existingVideos = await tx.postVideo.findMany({
    where: {
      postId,
      id: { not: draftVideo.id },
    },
    select: {
      providerAssetId: true,
      uploadUid: true,
    },
  });

  existingVideos.forEach((video) => {
    const assetUid = video.providerAssetId ?? video.uploadUid;
    if (assetUid) removedAssetUids.push(assetUid);
  });

  await tx.postVideo.deleteMany({
    where: {
      postId,
      id: { not: draftVideo.id },
    },
  });

  await tx.postVideo.update({
    where: { id: draftVideo.id },
    data: {
      postId,
      draftKey: null,
      status: "PROCESSING",
    },
  });

  return removedAssetUids;
}

/**
 * 게시글에 연결된 기존 동영상 자산을 제거 대상으로 모으고 DB 연결을 해제
 *
 * @param {Prisma.TransactionClient} tx - 게시글 수정 트랜잭션 클라이언트
 * @param {number} postId - 동영상을 제거할 게시글 ID
 * @returns {Promise<string[]>} 외부 자산 정리 대상 UID 목록
 */
async function removeAttachedPostVideo(
  tx: Prisma.TransactionClient,
  postId: number
): Promise<string[]> {
  const attachedVideos = await tx.postVideo.findMany({
    where: { postId },
    select: {
      providerAssetId: true,
      uploadUid: true,
    },
  });

  // 게시글 수정 시 removeVideo 요청이 들어오면 연결 자산 일괄 제거
  await tx.postVideo.deleteMany({ where: { postId } });

  return attachedVideos
    .map((video) => video.providerAssetId ?? video.uploadUid)
    .filter((assetUid): assetUid is string => Boolean(assetUid));
}

interface PostDeleteCleanupTarget {
  id: number;
  tags: { name: string }[];
  video?: {
    providerAssetId?: string | null;
    uploadUid?: string | null;
  } | null;
}

/**
 * 게시글 삭제 공통 후처리
 * 태그 연결 해제와 count 정리, 연결 동영상 삭제, 0개 태그 정리를 같은 규칙으로 수행
 *
 * @param {PostDeleteCleanupTarget} target - 삭제 대상 게시글과 후처리에 필요한 태그/동영상 메타
 * @returns {Promise<void>} 게시글 삭제와 관련 정리 작업 수행
 */
export async function hardDeletePostWithCleanup(
  target: PostDeleteCleanupTarget
) {
  const tagNames = Array.from(new Set(target.tags.map((tag) => tag.name)));
  const assetUid = target.video?.providerAssetId ?? target.video?.uploadUid ?? null;

  await db.$transaction(async (tx) => {
    if (tagNames.length) {
      // 공용 태그 사전은 row를 재사용하되, 현재 게시글과의 연결은 먼저 끊어 FK 정리와 count 보정을 분리
      await tx.post.update({
        where: { id: target.id },
        data: { tags: { set: [] } },
      });

      await tx.postTag.updateMany({
        where: { name: { in: tagNames }, count: { gt: 0 } },
        data: { count: { decrement: 1 } },
      });

      await tx.postTag.deleteMany({
        where: {
          name: { in: tagNames },
          count: { lte: 0 },
        },
      });
    }

    // 게시글 첨부 동영상은 부모 콘텐츠와 함께 정리해 orphan record를 남기지 않음
    await tx.postVideo.deleteMany({ where: { postId: target.id } });
    await tx.post.delete({ where: { id: target.id } });
  });

  if (assetUid) {
    await deleteCloudflareStreamAsset(assetUid);
  }
}

/**
 * 게시글 저장 직후 현재 draft 블록을 실제 PostBlock 레코드로 동기화
 * TEXT는 본문, VIDEO는 연결된 PostVideo, IMAGE는 현재 PostImage 순서, EMBED는 정규화된 외부 링크 메타를 저장
 *
 * @param {Prisma.TransactionClient} tx - 게시글 저장 트랜잭션 클라이언트
 * @param {number} postId - 블록을 동기화할 게시글 ID
 * @param {string | null} [description] - fallback 본문 문자열
 * @param {PostEditorBlock[]} [draftBlocks] - 저장 직전 편집기 블록 스냅샷
 * @returns {Promise<void>} 현재 draft 상태를 PostBlock 레코드로 반영
 */
async function syncPostBlocksFromDraft(
  tx: Prisma.TransactionClient,
  postId: number,
  description?: string | null,
  draftBlocks?: PostEditorBlock[]
) {
  const [images, video] = await Promise.all([
    tx.postImage.findMany({
      where: { postId },
      select: { id: true },
      orderBy: { order: "asc" },
    }),
    tx.postVideo.findUnique({
      where: { postId },
      select: { id: true },
    }),
  ]);

  await tx.postBlock.deleteMany({ where: { postId } });

  // 블록 에디터 입력 우선
  // blocksJson이 비어 있더라도 최소 TEXT 블록 하나만 유지해 본문 구조를 새 포맷 기준으로 통일
  const sourceBlocks =
    draftBlocks?.length
      ? draftBlocks
      : [
          {
            id: "fallback-text-0",
            type: "TEXT" as const,
            textContent: description ?? "",
          },
        ];
  const blocks: Prisma.PostBlockCreateManyInput[] = [];
  let nextOrder = 0;
  let nextImageIndex = 0;

  // TEXT / VIDEO / IMAGE 블록을 현재 저장 자산 순서와 맞춰 실제 PostBlock 레코드로 변환
  for (const block of sourceBlocks) {
    if (block.type === "TEXT") {
      const trimmed = block.textContent?.trim();
      if (!trimmed) continue;

      blocks.push({
        postId,
        type: "TEXT",
        order: nextOrder++,
        textContent: trimmed,
      });
      continue;
    }

    if (block.type === "VIDEO") {
      if (!video?.id) continue;

      blocks.push({
        postId,
        type: "VIDEO",
        order: nextOrder++,
        postVideoId: video.id,
      });
      continue;
    }

    if (block.type === "IMAGE") {
      const image = images[nextImageIndex];
      nextImageIndex += 1;
      if (!image) continue;

      blocks.push({
        postId,
        type: "IMAGE",
        order: nextOrder++,
        postImageId: image.id,
      });
      continue;
    }

    if (block.type === "EMBED") {
      const embedUrl = block.embedUrl?.trim();
      if (!embedUrl) continue;

      blocks.push({
        postId,
        type: "EMBED",
        order: nextOrder++,
        embedProvider: block.embedProvider ?? "YOUTUBE",
        embedUrl,
        embedTitle: block.embedTitle ?? null,
        embedThumbnailUrl: block.embedThumbnailUrl ?? null,
      });
    }
  }

  if (blocks.length) {
    await tx.postBlock.createMany({ data: blocks });
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 게시글 검색 조건 쿼리 빌더
 *
 * [데이터 가공 전략]
 * - 커뮤니티 특성에 따라 지역 필터 적용 여부가 달라짐
 * - 지역성 카테고리 (CREW, FREE) : 유저의 DB 설정(RegionRange)에 따라 지역 필터를 적용
 * - 정보성 카테고리 (LOG, MAP, RECOMMEND, COMPASS) : 지역 필터 없이 전국(ALL) 단위로 조회
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
 * @returns {Promise<PostDetail | null>} 게시글 상세 정보 또는 null
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
        video: true,
        blocks: {
          orderBy: { order: "asc" },
          include: {
            postImage: true,
            postVideo: true,
          },
        },
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
 * @returns {Promise<PostDetail | null>} 캐시가 적용된 게시글 상세 정보
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
 * - 첫 페이지 totalCount를 함께 반환해 무한스크롤 중에도 총 게시글 수 문구를 고정 표시
 *
 * @param {PostSearchParams | undefined} params - 검색 조건
 * @param {number} viewerId - 조회자 ID
 * @param {number | null} cursor - 페이지네이션 커서
 * @returns {Promise<PostsPage>} 게시글 목록 페이지 데이터
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

  const [rows, totalCount] = await Promise.all([
    db.post.findMany({
      where,
      select: POST_SELECT,
      orderBy: { created_at: "desc" },
      take: TAKE + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    }),
    db.post.count({ where }),
  ]);

  const hasNextPage = rows.length > TAKE;
  const posts = hasNextPage ? rows.slice(0, TAKE) : rows;
  const nextCursor = hasNextPage ? posts[posts.length - 1].id : null;

  return { posts: posts as PostDetail[], nextCursor, totalCount };
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
 * @returns {Promise<ServiceResult<{ postId: number }>>} 생성된 게시글 ID 또는 실패 정보
 */
export async function createPost(
  userId: number,
  data: PostCreateDTO
): Promise<ServiceResult<{ postId: number }>> {
  try {
    // 작성 가능 상태 확인
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    const nextTags = Array.from(new Set(data.tags));

    const post = await db.$transaction(async (tx) => {
      // 게시글 본문 생성
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

      // 태그 연결 및 count 보정
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

      // 첨부 이미지 저장
      if (data.photos.length) {
        await Promise.all(
          data.photos.map((url, index) =>
            tx.postImage.create({
              data: {
                url,
                order: index,
                isAnimated: data.photosAnimated?.[index] ?? false,
                post: { connect: { id: newPost.id } },
              },
            })
          )
        );
      }

      // 동영상 draft 연결
      if (!data.removeVideo && data.videoDraftKey) {
        await attachDraftVideoToPost(tx, userId, newPost.id, data.videoDraftKey);
      }

      // 본문 블록 동기화
      await syncPostBlocksFromDraft(
        tx,
        newPost.id,
        data.description,
        data.blocks
      );
      return newPost;
    });

    // 작성 후 뱃지 체크
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
 * @returns {Promise<ServiceResult<{ postId: number }>>} 수정된 게시글 ID 또는 실패 정보
 */
export async function updatePost(
  userId: number,
  data: PostUpdateDTO
): Promise<ServiceResult<{ postId: number }>> {
  try {
    // 수정 가능 상태 확인
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    // 소유권 확인
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

    // 위치 업데이트 payload 구성
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

    // 수정 트랜잭션 실행
    const staleVideoAssetUids = await db.$transaction(async (tx) => {
      const removedAssetUids: string[] = [];

      // 기존 이미지/태그 초기화
      await tx.postImage.deleteMany({ where: { postId: data.id } });
      await tx.post.update({
        where: { id: data.id },
        data: { tags: { set: [] } },
      });

      // 기본 정보 및 태그 갱신
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
                isAnimated: data.photosAnimated?.[index] ?? false,
                post: { connect: { id: data.id } },
              },
            })
          )
        );
      }

      // 동영상 제거 또는 새 draft 연결
      if (data.removeVideo) {
        removedAssetUids.push(...(await removeAttachedPostVideo(tx, data.id)));
      } else if (data.videoDraftKey) {
        removedAssetUids.push(
          ...(await attachDraftVideoToPost(tx, userId, data.id, data.videoDraftKey))
        );
      }

      // 본문 블록 동기화
      await syncPostBlocksFromDraft(tx, data.id, data.description, data.blocks);
      return Array.from(new Set(removedAssetUids));
    });

    // 오래된 외부 동영상 자산 정리
    if (staleVideoAssetUids.length) {
      await Promise.allSettled(
        staleVideoAssetUids.map((assetUid) => deleteCloudflareStreamAsset(assetUid))
      );
    }

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
 * @returns {Promise<ServiceResult>} 게시글 삭제 처리 결과
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
      select: {
        userId: true,
        tags: { select: { name: true } },
        video: { select: { providerAssetId: true, uploadUid: true } },
      },
    });

    if (!post) return { success: false, error: "게시글을 찾을 수 없습니다." };
    if (post.userId !== userId)
      return { success: false, error: "권한이 없습니다." };

    await hardDeletePostWithCleanup({
      id: postId,
      tags: post.tags,
      video: post.video,
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
