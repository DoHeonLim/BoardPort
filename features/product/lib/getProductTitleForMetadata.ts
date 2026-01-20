/**
 * File Name : features/product/lib/getProductTitleForMetadata.ts
 * Description : 제품 상세 메타데이터(title) 생성 전용 — title-only 캐시로 비용 최소화
 * Author : 임도헌
 *
 * Key Points
 * - generateMetadata() 경로에서는 redirect/조회수 증가/개인화 로직이 실행되면 안 된다.
 * - getCachedProduct(상세 본문용)는 include가 많아 metadata 호출 시 불필요한 DB 비용이 크다.
 * - 따라서 title-only 캐시(getCachedProductTitleById)를 사용해:
 *   1) redirect 위험 제거
 *   2) join 비용 제거
 *   3) invalidation 범위 최소화
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.04  임도헌   Created   metadata 경로 안전성 확보를 위해 title 전용 fetch 분리
 * 2026.01.04  임도헌   Modified  getCachedProductTitleById(title-only 캐시)로 전환하여 더 얇게 최적화
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

import { getCachedProductTitleById } from "@/app/products/view/[id]/actions/product";

export async function getProductTitleForMetadata(
  id: number
): Promise<string | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  return getCachedProductTitleById(id);
}
