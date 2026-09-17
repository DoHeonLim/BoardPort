/**
 * File Name : app/(app)/(tabs)/profile/(product)/my-likes/page.tsx
 * Description : 프로필 나의 관심 목록 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   TanStack Query HydrationBoundary 기반 서버 프리패치 및 페이지 구현
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/(product)/my-likes/page.tsx 에서 app/(app)/(tabs)/profile/(product)/my-likes/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.09.11  임도헌   Modified  상품·게시글·다시보기 탭별 찜 목록 프리페치와 개수 조회 확장
 * 2026.09.11  임도헌   Modified  콘텐츠별 기본 보기와 URL 기반 리스트·그리드 상태 추가
 */

import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import { getUserProductsList } from "@/features/product/service/userList";
import type { LikedProductCursor } from "@/features/product/types";
import MyLikesList from "@/features/user/components/MyLikesList";
import {
  getLikedPostsPage,
  getLikedRecordingsPage,
  getMyLikesCounts,
} from "@/features/user/service/myLikes";
import type { MyLikesCursor, MyLikesTab } from "@/features/user/types";

/**
 * 내 관심 목록 페이지
 *
 * [기능]
 * - 세션 검증을 통한 로그인 여부 확인 및 비인가 사용자 리다이렉트 처리
 * - URL query로 선택한 상품·게시글·다시보기 탭 상태 유지
 * - QueryClient를 활용한 현재 탭 첫 페이지 서버 프리페치 적용
 * - 탭별 찜 개수 병렬 조회
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달
 */
export default async function MyLikesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; view?: string }>;
}) {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/my-likes");
  }
  const userId = session.id;
  const queryClient = getQueryClient();
  const resolvedSearchParams = await searchParams;
  const requestedType = resolvedSearchParams.type;
  const activeTab: MyLikesTab =
    requestedType === "posts" || requestedType === "recordings"
      ? requestedType
      : "products";

  const prefetch =
    activeTab === "products"
      ? queryClient.prefetchInfiniteQuery({
          queryKey: queryKeys.products.userScope("LIKED", userId),
          queryFn: () => getUserProductsList({ type: "LIKED", userId }, null),
          initialPageParam: null as LikedProductCursor | null,
        })
      : activeTab === "posts"
        ? queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.posts.liked(userId),
            queryFn: () => getLikedPostsPage(userId, null),
            initialPageParam: null as MyLikesCursor | null,
          })
        : queryClient.prefetchInfiniteQuery({
            queryKey: queryKeys.streams.likedRecordings(userId),
            queryFn: () => getLikedRecordingsPage(userId, null),
            initialPageParam: null as MyLikesCursor | null,
          });
  const [, initialCounts] = await Promise.all([
    prefetch,
    getMyLikesCounts(userId),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyLikesList
        userId={userId}
        activeTab={activeTab}
        initialCounts={initialCounts}
        requestedView={
          resolvedSearchParams.view === "grid" ||
          resolvedSearchParams.view === "list"
            ? resolvedSearchParams.view
            : undefined
        }
      />
    </HydrationBoundary>
  );
}
