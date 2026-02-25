/**
 * File Name : app/(tabs)/profile/(product)/my-sa.tsxles/page.tsx
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
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import MySalesProductList from "@/features/product/components/MySalesProductList";
import {
  getCachedInitialUserProducts,
  getCachedUserTabCounts,
} from "@/features/product/service/userList";

/**
 * 내 판매 관리 페이지
 *
 * [기능]
 * 1. 판매 중, 예약 중, 판매 완료 상품을 탭으로 나누어 보여줌
 * 2. 초기 렌더링 시 '판매 중(SELLING)' 목록과 전체 탭별 카운트 정보를 로드
 * 3. `MySalesProductList`를 통해 탭 전환 및 상태 변경(Optimistic) 로직을 처리
 */
export default async function MySalesPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/my-sales");
  }
  const userId = session.id;

  // 1. 초기 데이터 병렬 조회 (Cache 사용)
  const [initialSelling, initialCounts] = await Promise.all([
    // 첫 탭인 '판매 중' 데이터만 서버에서 미리 로드
    getCachedInitialUserProducts({ type: "SELLING", userId }),
    // 상단 탭에 표시할 각 상태별 상품 개수
    getCachedUserTabCounts(userId),
  ]);

  return (
    <MySalesProductList
      userId={userId}
      initialSelling={initialSelling}
      initialCounts={initialCounts}
    />
  );
}
