/**
 * File Name : features/post/components/postDetail/PostDetailMeta.tsx
 * Description : 게시글 상세 메타 정보 (좋아요 버튼, 조회수, 댓글 수, 작성일)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   PostDetail Meta 분리
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 아이콘/텍스트 색상 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.05.18  임도헌   Modified  상세 메타에 댓글 수 표시 및 post stats 캐시 연동
 * 2026.05.18  임도헌   Modified  상세 통계 아이콘을 목록 카드와 같은 solid 문법으로 통일
 * 2026.05.26  임도헌   Modified  initialData 기반 stats query에 local queryFn을 부여해 refetch 경고 방지
 * 2026.06.17  임도헌   Modified  좋아요 상태 캐시 분리를 위해 viewerId 전달
 * 2026.06.21  임도헌   Modified  관련 장소 또는 작성 동네 메타를 상세 화면에 표시
 */
"use client";

import PostLikeButton from "@/features/post/components/PostLikeButton";
import {
  ChatBubbleLeftIcon,
  EyeIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import TimeAgo from "@/components/ui/TimeAgo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { formatNormalizedRegion } from "@/features/map/utils/normalizeRegion";

interface PostDetailMetaProps {
  postId: number;
  isLiked: boolean;
  likeCount: number;
  views: number;
  commentCount: number;
  createdAt: string;
  viewerId?: number | null;
  locationName?: string | null;
  region1?: string | null;
  region2?: string | null;
  region3?: string | null;
  feedRegion1?: string | null;
  feedRegion2?: string | null;
  feedRegion3?: string | null;
}

/**
 * 게시글 하단의 메타 정보 영역
 * - 좌측: 좋아요 버튼 (PostLikeButton)
 * - 우측: 관련 장소/작성 동네, 조회수, 댓글 수, 작성 시간 (TimeAgo)
 * - 댓글 수는 댓글 작성/삭제 mutation이 갱신하는 post stats 캐시 기준으로 표시
 */
export default function PostDetailMeta({
  postId,
  isLiked,
  likeCount,
  views,
  commentCount,
  createdAt,
  viewerId = null,
  locationName,
  region1,
  region2,
  region3,
  feedRegion1,
  feedRegion2,
  feedRegion3,
}: PostDetailMetaProps) {
  const queryClient = useQueryClient();
  const statsQueryKey = queryKeys.posts.stats(postId);
  const initialStats = { commentCount };
  const { data: stats } = useQuery({
    queryKey: statsQueryKey,
    queryFn: async () =>
      queryClient.getQueryData<typeof initialStats>(statsQueryKey) ??
      initialStats,
    initialData: initialStats,
    staleTime: Infinity,
    enabled: false,
  });
  const explicitLocationText = locationName
    ? formatNormalizedRegion({ region1, region2, region3 })
    : "";
  const feedRegionText = formatNormalizedRegion({
    region1: feedRegion1,
    region2: feedRegion2,
    region3: feedRegion3,
  });
  const locationText = explicitLocationText || feedRegionText;
  const locationLabel = explicitLocationText ? "관련 장소" : "작성 동네";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PostLikeButton
        isLiked={isLiked}
        likeCount={likeCount}
        postId={postId}
        viewerId={viewerId}
      />

      <div className="flex flex-col gap-2 text-xs text-muted sm:items-end">
        {locationText && (
          <div
            className="flex max-w-full items-center gap-1"
            title={`${locationLabel}: ${locationText}`}
          >
            <MapPinIcon className="size-4 shrink-0" />
            <span className="shrink-0 font-medium">{locationLabel}</span>
            <span className="truncate">{locationText}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <EyeIcon className="size-4" />
            <span>{views.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <ChatBubbleLeftIcon className="size-4" />
            <span>{stats.commentCount.toLocaleString()}</span>
          </div>
          <span className="text-border">|</span>
          <TimeAgo date={createdAt} />
        </div>
      </div>
    </div>
  );
}
