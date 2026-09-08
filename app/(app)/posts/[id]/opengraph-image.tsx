/**
 * File Name : app/(app)/posts/[id]/opengraph-image.tsx
 * Description : 게시글 상세 동적 OG 이미지 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.13  임도헌   Created   게시글 정보(제목, 내용, 작성자, 썸네일)를 포함한 OG 이미지 생성
 * 2026.03.23  임도헌   Modified  잘못된 id 경로는 DB 조회 전 가드해 OG 이미지 라우트 예외 가능성을 줄임
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/[id]/opengraph-image.tsx 에서 app/(app)/posts/[id]/opengraph-image.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.15  임도헌   Modified  Windows 로컬 next/og 폰트 경로 오류 회피를 위한 sharp 기반 PNG 생성
 * 2026.08.22  임도헌   Modified  OG 대표 이미지 조회에 SSRF·응답 크기·픽셀 제한 경계 적용
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 * 2026.08.30  임도헌   Modified  Next.js 16에서 비동기로 전달되는 게시글 경로 정보 처리 보완
 * 2026.08.31  임도헌   Modified  로컬 Pretendard 글꼴 합성으로 운영 OG 이미지 한글 깨짐 방지
 * 2026.09.01  임도헌   Modified  Vercel 호환 OTF 글꼴 적용 및 썸네일 변환 실패 폴백 보완
 * 2026.09.01  임도헌   Modified  공백 없는 긴 게시글 제목의 카드 영역 내 줄바꿈 보완
 */

import sharp, { type OverlayOptions } from "sharp";
import db from "@/lib/db";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import {
  fetchSafeOgImage,
  SAFE_OG_IMAGE_MAX_PIXELS,
} from "@/lib/media/safeImageFetch";
import {
  createOgTextOverlays,
  splitOgTextLines,
  type OgCard,
  type OgTextSpec,
} from "@/lib/media/ogText";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const POST_IMAGE_FALLBACK_TEXT = {
  text: "BoardPort",
  x: 900,
  baseline: 316,
  fontSize: 54,
  color: "#94a3b8",
  anchor: "middle",
} satisfies OgTextSpec;

/**
 * 잘못된 ID나 삭제된 게시글을 위한 기본 BoardPort OG 이미지
 */
function buildFallbackCard() {
  return {
    svg: `
      <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#f8fafc"/>
      </svg>
    `,
    texts: [
      {
        text: "BoardPort",
        x: 600,
        baseline: 292,
        fontSize: 78,
        color: "#1e3a8a",
        anchor: "middle",
      },
      {
        text: "항해일지",
        x: 600,
        baseline: 352,
        fontSize: 30,
        color: "#64748b",
        anchor: "middle",
      },
    ],
  } satisfies OgCard;
}

/**
 * 게시글 정보 카드의 도형과 글꼴 텍스트 사양 생성
 */
function buildPostCard({
  title,
  description,
  categoryName,
  username,
  hasImage,
}: {
  title: string;
  description: string;
  categoryName: string;
  username: string;
  hasImage: boolean;
}) {
  const texts: OgTextSpec[] = [
    {
      text: categoryName,
      x: 147,
      baseline: 112,
      fontSize: 23,
      color: "#1e3a8a",
      anchor: "middle",
    },
    ...splitOgTextLines(title, 14, 2, "BoardPort").map((line, index) => ({
      text: line,
      x: 74,
      baseline: 168 + index * 50,
      fontSize: 42,
      color: "#0f172a",
    })),
    ...splitOgTextLines(description, 18, 3, "BoardPort").map((line, index) => ({
      text: line,
      x: 74,
      baseline: 302 + index * 34,
      fontSize: 25,
      color: "#64748b",
    })),
    {
      text: `작성자: ${username}`,
      x: 74,
      baseline: 548,
      fontSize: 24,
      color: "#64748b",
    },
    {
      text: "항해일지",
      x: 464,
      baseline: 548,
      fontSize: 28,
      color: "#1e3a8a",
      anchor: "end",
    },
    ...(hasImage ? [] : [POST_IMAGE_FALLBACK_TEXT]),
  ];

  return {
    svg: `
      <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#f8fafc"/>
        <rect x="0" y="0" width="600" height="630" fill="#ffffff"/>
        <rect x="48" y="44" width="504" height="542" rx="30" fill="#f8fafc"/>
        <rect x="48" y="44" width="504" height="542" rx="30" fill="none" stroke="#e2e8f0" stroke-width="2"/>
        <rect x="74" y="82" width="146" height="44" rx="14" fill="#dbeafe"/>
        <rect x="74" y="260" width="390" height="126" rx="20" fill="#ffffff"/>
        <rect x="74" y="260" width="390" height="126" rx="20" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
        <rect x="74" y="492" width="390" height="2" rx="1" fill="#dbeafe"/>
        <rect x="600" y="0" width="600" height="630" fill="#dbeafe"/>
      </svg>
    `,
    texts,
  } satisfies OgCard;
}

/**
 * 게시글 정보 카드와 대표 이미지를 합성한 PNG Response 생성
 */
async function createPngResponse(card: OgCard, imageBuffer: Buffer | null) {
  const composites: OverlayOptions[] = [];

  if (imageBuffer) {
    try {
      // 썸네일은 우측 절반에 cover 합성
      const thumbnail = await sharp(imageBuffer, {
        limitInputPixels: SAFE_OG_IMAGE_MAX_PIXELS,
        failOn: "warning",
      })
        .resize(600, 630, { fit: "cover", position: "centre" })
        .png()
        .toBuffer();
      composites.push({ input: thumbnail, left: 600, top: 0 });
    } catch {
      // 다운로드 후 디코딩이 실패해도 썸네일 영역이 빈 상태로 남지 않게 안내
      composites.push(
        ...(await createOgTextOverlays([POST_IMAGE_FALLBACK_TEXT]))
      );
    }
  }

  composites.push(...(await createOgTextOverlays(card.texts)));

  const png = await sharp(Buffer.from(card.svg))
    .composite(composites)
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}

/**
 * Next.js가 비동기로 전달하는 게시글 ID를 해석해 공유 이미지를 생성
 *
 * @param params - 게시글 ID를 담은 비동기 경로 정보
 * @returns 게시글 정보 또는 기본 안내 화면을 합성한 PNG 응답
 */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isFinite(id) || id <= 0) {
    return createPngResponse(buildFallbackCard(), null);
  }

  const post = await db.post.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      category: true,
      images: { take: 1, orderBy: { order: "asc" }, select: { url: true } },
      user: { select: { username: true } },
    },
  });

  if (!post) {
    return createPngResponse(buildFallbackCard(), null);
  }

  const categoryName =
    POST_CATEGORY[post.category as PostCategoryType] || post.category;
  const thumbUrl = post.images[0]?.url ? `${post.images[0].url}/public` : null;
  const imageBuffer = await fetchSafeOgImage(thumbUrl);

  return createPngResponse(
    buildPostCard({
      title: post.title,
      description:
        post.description?.trim().replace(/\s+/g, " ") ||
        "보드포트 항해일지를 확인해보세요.",
      categoryName,
      username: post.user.username,
      hasImage: !!imageBuffer,
    }),
    imageBuffer
  );
}
