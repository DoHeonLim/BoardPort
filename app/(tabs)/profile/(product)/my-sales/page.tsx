/**
 * File Name : app/(tabs)/profile/(product)/my-sales/page
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
 */

import getSession from "@/lib/session";
import MySalesProductList from "@/features/product/components/MySalesProductList";
// 커서 기반 공용 액션 (SELLING / RESERVED / SOLD)
import {
  getCachedInitialUserProducts,
  getCachedUserTabCounts,
} from "@/features/product/lib/getUserProducts";
import { redirect } from "next/navigation";

export default async function MySalesPage() {
  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/profile/my-sales");
  }
  const userId = session.id;

  const [initialSelling, initialCounts] = await Promise.all([
    getCachedInitialUserProducts({ type: "SELLING", userId }),
    getCachedUserTabCounts(userId),
  ]);

  return (
    <>
      <MySalesProductList
        userId={userId}
        initialSelling={initialSelling}
        initialCounts={initialCounts}
      />
    </>
  );
}
