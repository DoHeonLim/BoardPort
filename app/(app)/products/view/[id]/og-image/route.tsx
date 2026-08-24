/**
 * File Name : app/(app)/products/view/[id]/og-image/route.tsx
 * Description : 제품 공유 미리보기용 고정 OG 이미지 라우트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.15  임도헌   Created   file-based metadata 해시 경로와 별개로 외부 공유 미리보기용 고정 이미지 URL 제공
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 params 전환 및 사용 중단 예정인 preferredRegion 제거
 */

import ProductOpenGraphImage from "../opengraph-image";

export const runtime = "nodejs";

/**
 * 외부 공유 크롤러용 해시 없는 상품 OG 이미지 응답 위임
 */
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  return ProductOpenGraphImage({ params });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 10;
