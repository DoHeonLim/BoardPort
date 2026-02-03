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
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import { getCachedInitialUserProducts } from "@/features/product/service/userList";
import MyPurchasesList from "@/features/product/components/MyPurchasesList";

/**
 * 내 구매 목록 페이지
 *
 * [기능]
 * 1. 내가 구매 완료(Sold 처리 시 구매자로 지정됨)한 상품 목록을 로드합니다.
 * 2. `getCachedInitialUserProducts`를 통해 '구매함(PURCHASED)' 목록을 조회합니다.
 * 3. `MyPurchasesList` 컴포넌트에서 무한 스크롤 및 리뷰 작성을 처리합니다.
 */
export default async function MyPurchasesPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/my-purchases");
  }
  const userId = session.id;

  // 1. 초기 데이터 조회 (PURCHASED 스코프)
  const initialPurchased = await getCachedInitialUserProducts({
    type: "PURCHASED",
    userId,
  });

  return (
    <MyPurchasesList userId={userId} initialPurchased={initialPurchased} />
  );
}
