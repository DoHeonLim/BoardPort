/**
 * File Name : app/(app)/streams/[id]/og-image/route.tsx
 * Description : 방송 공유 미리보기용 고정 OG 이미지 라우트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.15  임도헌   Created   file-based metadata 해시 경로와 별개로 외부 공유 미리보기용 고정 이미지 URL 제공
 */

import StreamOpenGraphImage from "../opengraph-image";

export const runtime = "nodejs";

/**
 * 외부 공유 크롤러가 해시 없는 안정적인 URL로 방송 OG 이미지를 가져가도록 위임
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return StreamOpenGraphImage({ params });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "auto";
export const maxDuration = 10;
