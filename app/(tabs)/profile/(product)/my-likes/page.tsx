/**
 * File Name : app/(tabs)/profile/(product)/my-likes/page.tsx
 * Description : 프로필 나의 찜한 내역 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   TanStack Query HydrationBoundary 기반 서버 프리패치 및 페이지 구현
 */

import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import { getUserProductsList } from "@/features/product/service/userList";
import MyLikesList from "@/features/product/components/MyLikesList";

/**
 * 내 찜한 내역 페이지
 *
 * [기능]
 * - 세션 검증을 통한 로그인 여부 확인 및 비인가 사용자 리다이렉트 처리
 * - QueryClient를 활용한 '찜함(LIKED)' 범위 상품 목록 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달
 */
export default async function MyLikesPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/my-likes");
  }
  const userId = session.id;
  const queryClient = getQueryClient();

  // 서버에서 1페이지 프리패치 (Hydration)
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.products.userScope("LIKED", userId),
    queryFn: () => getUserProductsList({ type: "LIKED", userId }, null),
    initialPageParam: null as number | null,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyLikesList userId={userId} />
    </HydrationBoundary>
  );
}
