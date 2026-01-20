/**
 * File Name : features/stream/lib/getStreams.ts
 * Description : 라이브 스트리밍 리스트 조회 (Broadcast 스키마)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.17  임도헌   Created   Broadcast 기준으로 재구현 + 직렬화 유틸 적용
 * 2025.09.17  임도헌   Modified  불필요한 scopeFilter 제거, where 인라인 분기
 * 2025.09.23  임도헌   Modified  serializeStream 최신 스펙 반영(stream_id/ended_at)
 * 2025.09.30  임도헌   Modified  상위 카테고리 클릭 시 하위 카테고리 포함 필터링
 * 2025.11.22  임도헌   Modified  커서 조건 분기(id < cursor) 가독성/안전성 개선
 * 2025.11.23  임도헌   Modified  FOLLOWERS 방송에서 본인 방송은 항상 노출되도록 예외 추가
 * 2025.11.23  임도헌   Modified  팔로잉 탭에서도 본인 방송이 함께 노출되도록 조건 보강
 * 2026.01.03  임도헌   Modified  viewer follow-state(select followers) 조회를 옵션화하여 리스트 페이지 DB 부담 감소(기본 OFF)
 * 2026.01.08  임도헌   Modified  로그인 유저(scope=all)에게 비팔로워 방송도 노출되도록 조건 완화
 * 2026.01.08  임도헌   Modified  비로그인 분기 제거 (모든 접근은 로그인 상태 전제)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";
import { serializeStream } from "@/features/stream/lib/serializeStream";
import type { BroadcastSummary, StreamVisibility } from "@/types/stream";

type Scope = "all" | "following";

export async function getStreams(params: {
  scope: Scope;
  category?: string;
  keyword?: string;
  viewerId: number | null;
  cursor: number | null; // id < cursor
  take: number; // TAKE(+1) 권장

  /**
   * includeViewerFollowState
   * - true: 카드/리스트에서 “해당 유저를 내가 팔로우 중인지”를 정확히 계산하기 위해
   *   followers(where: { followerId: viewerId }, take: 1) 조인을 포함한다.
   * - false(기본): 스트리밍 리스트에서는 보통 필요한 것이 잠금 여부/내 방송 여부이며,
   *   where 조건으로 FOLLOWERS는 접근 가능한 것만 노출을 유지하는 경우
   *   row별 팔로우 조인이 불필요하므로 DB 부담을 줄이기 위해 OFF로 둔다.
   */
  includeViewerFollowState?: boolean;
}): Promise<BroadcastSummary[]> {
  const {
    scope,
    category,
    keyword,
    viewerId,
    cursor,
    take,
    includeViewerFollowState = false,
  } = params;

  // 안전 장치: viewerId가 없으면(비로그인) 빈 배열 반환 (미들웨어에서 막히겠지만 방어 코드)
  if (!viewerId) return [];

  // 기본: 방송 중만
  const whereBase = {
    status: "CONNECTED",
  };

  // 카테고리: 본인 또는 parent가 해당 카테고리 (하위 포함)
  const categoryCondition = category
    ? {
        OR: [
          { category: { eng_name: category } }, // 본인이 해당 카테고리
          { category: { parent: { eng_name: category } } }, // 부모가 해당 카테고리
        ],
      }
    : undefined;

  // 키워드: 제목/설명/유저/태그
  const kw = keyword?.trim();
  const keywordFilter = kw
    ? {
        OR: [
          { title: { contains: kw, mode: "insensitive" as const } },
          { description: { contains: kw, mode: "insensitive" as const } },
          {
            liveInput: {
              user: {
                username: { contains: kw, mode: "insensitive" as const },
              },
            },
          },
          {
            tags: {
              some: {
                name: { contains: kw, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {};

  // === 접근 제어 조건 구성 ===
  let where: any;

  if (scope === "following") {
    // following 탭: 내가 팔로우하는 유저의 방송 + 내 방송
    const conditions: any[] = [
      whereBase,
      keywordFilter,
      {
        liveInput: {
          user: {
            OR: [
              { id: viewerId }, // 내 방송
              {
                followers: {
                  some: { followerId: viewerId }, // 내가 팔로우하는 유저
                },
              },
            ],
          },
        },
      },
      {
        visibility: {
          in: ["PUBLIC", "FOLLOWERS", "PRIVATE"] as StreamVisibility[],
        },
      },
    ];

    if (cursor) conditions.push({ id: { lt: cursor } });
    if (categoryCondition) conditions.push(categoryCondition);

    where = {
      AND: conditions.filter((c) => Object.keys(c).length > 0),
    };
  } else {
    // scope === "all" (로그인 유저 기준 전체 보기)
    const conditions: any[] = [
      whereBase,
      keywordFilter,
      {
        OR: [
          // 1) 공개 방송
          { visibility: "PUBLIC" },

          // 2) 팔로워 전용 방송 (모두 노출 -> 잠금 여부는 serialize에서 처리)
          { visibility: "FOLLOWERS" },

          // 3) 비밀 방송 (모두 노출 -> 비밀번호 모달)
          { visibility: "PRIVATE" },
        ],
      },
    ];

    if (cursor) conditions.push({ id: { lt: cursor } });
    if (categoryCondition) conditions.push(categoryCondition);

    where = {
      AND: conditions.filter((c) => Object.keys(c).length > 0),
    };
  }

  /**
   * select 최적화
   * - includeViewerFollowState=false(기본)일 때는 row별 followers 조인을 제거한다.
   */
  const shouldJoinFollowers = includeViewerFollowState === true;

  const rows = await db.broadcast.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      thumbnail: true,
      visibility: true,
      status: true,
      started_at: true,
      ended_at: true,
      liveInput: {
        select: {
          userId: true,
          provider_uid: true,
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              // viewer 기준 팔로우 상태가 필요할 때만 조인(기본 OFF)
              ...(shouldJoinFollowers
                ? {
                    followers: {
                      where: { followerId: viewerId },
                      select: { id: true },
                      take: 1,
                    },
                  }
                : {}),
            },
          },
        },
      },
      category: {
        select: { id: true, kor_name: true, icon: true },
      },
      tags: { select: { name: true } },
    },
    orderBy: { id: "desc" },
    take,
  });

  const mapped: BroadcastSummary[] = rows.map((b) => {
    const isMine = b.liveInput.userId === viewerId;

    /**
     * isFollowing 계산
     * - includeViewerFollowState=true: DB 조인 결과 사용
     * - includeViewerFollowState=false:
     *   - 리스트에서는 "잠금 표시"를 위해 팔로우 여부가 필요함.
     *   - false일 경우 정확한 잠금 표시가 불가능하므로, 호출부(page.tsx)에서 true로 설정해야 함.
     *   - 여기서는 fallback으로 false 처리 (잠금 상태로 표시됨 -> CTA 유도)
     */
    const isFollowing = shouldJoinFollowers
      ? Array.isArray((b.liveInput.user as any).followers) &&
        (b.liveInput.user as any).followers.length > 0
      : false;

    return serializeStream(
      {
        id: b.id,
        stream_id: b.liveInput.provider_uid,
        title: b.title,
        description: b.description,
        thumbnail: b.thumbnail,
        visibility: b.visibility as StreamVisibility,
        status: b.status,
        started_at: b.started_at,
        ended_at: b.ended_at ?? null,
        userId: b.liveInput.userId,
        user: {
          id: b.liveInput.user.id,
          username: b.liveInput.user.username,
          avatar: b.liveInput.user.avatar,
        },
        category: b.category
          ? {
              id: b.category.id,
              kor_name: b.category.kor_name,
              icon: b.category.icon,
            }
          : null,
        tags: b.tags ?? [],
      },
      { isFollowing, isMine }
    );
  });

  return mapped;
}
