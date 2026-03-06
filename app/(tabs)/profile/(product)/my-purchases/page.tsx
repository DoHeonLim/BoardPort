/**
 * File Name : app/(tabs)/profile/(product)/my-purchases/page.tsx
 * Description : 프로필 나의 구매 제품 페이지 (커서 기반 선로딩)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.30  임도헌   Created
 * 2024.11.30  임도헌   Modified  프로필 나의 구매 제품 페이지 추가
 * 2024.12.12  임도헌   Modified  뒤로가기 버튼 추가
 * 2025.10.17  임도헌   Modified  커서 기반 공용 액션(getInitialUserProducts) 사용 + 캐시 태그 분리
 * 2025.10.23  임도헌   Modified  캐시 리팩토링 적용: per-id 태그 + lib 캐시 래퍼 사용
 * 2025.11.06  임도헌   Modified  미로그인 가드(redirect) 추가
 * 2025.11.13  임도헌   Modified  뒤로가기 버튼 layout으로 이동
 * 2026.01.16  임도헌   Modified  불필요한 Fragment 제거
 * 2026.01.29  임도헌   Modified  내 구매 목록 페이지 주석 보강 및 구조 설명 추가
 * 2026.03.03  임도헌   Modified  TanStack Query HydrationBoundary 적용 및 initialPurchased Props 제거
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import { getUserProductsList } from "@/features/product/service/userList";
import MyPurchasesList from "@/features/product/components/MyPurchasesList";
import Skeleton from "@/components/ui/Skeleton";
import { Suspense } from "react";

/**
 * 내 구매 목록 페이지
 *
 * [기능]
 * - 로그인 세션 검증 및 비인가 사용자 리다이렉트 처리
 * - QueryClient를 활용한 '구매함(PURCHASED)' 범위 상품 목록의 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달
 * - `MyPurchasesList` 컴포넌트 렌더링 및 클라이언트 사이드 무한 스크롤 제어 위임
 */
export default async function MyPurchasesPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/my-purchases");
  }
  const userId = session.id;
  const queryClient = getQueryClient();

  // 1. 구매한 상품 첫 페이지를 미리 가져와 캐시에 저장함 (Prefetch).
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.products.userScope("PURCHASED", userId),
    queryFn: () => getUserProductsList({ type: "PURCHASED", userId }, null),
    initialPageParam: null as number | null,
  });

  return (
    // 2. 직렬화된 캐시 상태를 클라이언트로 전송함.
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ListSkeleton />}>
        <MyPurchasesList userId={userId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col px-page-x py-6 gap-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
