/**
 * File Name : app/(tabs)/profile/(product)/my-sales/page.tsx
 * Description : 프로필 나의 판매 제품 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.30  임도헌   Created
 * 2024.11.30  임도헌   Modified  프로필 나의 판매 제품 페이지 추가
 * 2024.12.02  임도헌   Modified  nextCache기능 추가
 * 2024.12.12  임도헌   Modified  뒤로가기 버튼 추가
 * 2025.10.17  임도헌   Modified  커서 기반 공용 액션(getInitialUserProducts) 사용
 * 2025.10.17  임도헌   Modified  SELLING만 초기 캐시 로딩, 나머지는 탭에서 지연 로드
 * 2025.10.20  임도헌   Modified  탭별 개수 전달
 * 2025.10.23  임도헌   Modified  캐시 리팩토링 적용: per-id 태그 + lib 캐시 래퍼 사용
 * 2025.11.13  임도헌   Modified  뒤로가기 버튼 layout으로 이동
 * 2026.01.16  임도헌   Modified  불필요한 Fragment 제거
 * 2026.01.29  임도헌   Modified  내 판매 관리 페이지 주석 보강 및 구조 설명 추가
 * 2026.03.03  임도헌   Modified  TanStack Query HydrationBoundary 적용 및 initialSelling Props 제거
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import MySalesProductList from "@/features/product/components/MySalesProductList";
import {
  getUserTabCounts,
  getUserProductsList,
} from "@/features/product/service/userList";

/**
 * 내 판매 관리 페이지
 *
 * [기능]
 * - 세션 검증을 통한 로그인 여부 확인 및 비인가 사용자 리다이렉트 처리
 * - TanStack Query를 활용한 '판매 중(SELLING)' 상태 상품 목록의 서버 프리패치(Prefetch) 적용
 * - 전체 탭별 카운트 정보의 서버 사이드 병렬 로드 및 캐시 주입
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달
 */
export default async function MySalesPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/my-sales");
  }
  const userId = session.id;
  const queryClient = getQueryClient();

  const [, initialCounts] = await Promise.all([
    // 첫 탭인 '판매 중(SELLING)' 데이터만 서버에서 미리 캐시에 주입
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.products.userScope("SELLING", userId),
      queryFn: () => getUserProductsList({ type: "SELLING", userId }, null),
      initialPageParam: null as number | null,
    }),
    getUserTabCounts(userId),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MySalesProductList userId={userId} initialCounts={initialCounts} />
    </HydrationBoundary>
  );
}
