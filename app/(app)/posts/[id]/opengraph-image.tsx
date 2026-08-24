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
 */

import sharp, { type OverlayOptions } from "sharp";
import db from "@/lib/db";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import {
  fetchSafeOgImage,
  SAFE_OG_IMAGE_MAX_PIXELS,
} from "@/lib/media/safeImageFetch";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 고정 폭 OG 카드용 텍스트 줄 분리
 */
function splitLines(value: string, maxChars: number, maxLines: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const lines: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (normalized.length > lines.join(" ").length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}...`;
  }
  return lines.length ? lines : ["BoardPort"];
}

/**
 * 외부 게시글 썸네일의 sharp 합성용 Buffer 조회
 */
/**
 * 잘못된 ID나 삭제된 게시글을 위한 기본 BoardPort OG 이미지
 */
function buildFallbackSvg() {
  return `
    <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#f8fafc"/>
      <text x="600" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="78" font-weight="700" fill="#1e3a8a">BoardPort</text>
      <text x="600" y="352" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#64748b">항해일지</text>
    </svg>
  `;
}

/**
 * 게시글 정보 패널 SVG 생성
 */
function buildPostSvg({
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
  const titleText = splitLines(title, 14, 2)
    .map(
      (line, index) =>
        `<text x="74" y="${168 + index * 50}" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#0f172a">${escapeSvgText(line)}</text>`
    )
    .join("");
  const descriptionText = splitLines(description, 18, 3)
    .map(
      (line, index) =>
        `<text x="74" y="${302 + index * 34}" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#64748b">${escapeSvgText(line)}</text>`
    )
    .join("");

  return `
    <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#f8fafc"/>
      <rect x="0" y="0" width="600" height="630" fill="#ffffff"/>
      <rect x="48" y="44" width="504" height="542" rx="30" fill="#f8fafc"/>
      <rect x="48" y="44" width="504" height="542" rx="30" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="74" y="82" width="146" height="44" rx="14" fill="#dbeafe"/>
      <text x="147" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#1e3a8a">${escapeSvgText(categoryName)}</text>
      ${titleText}
      <rect x="74" y="260" width="390" height="126" rx="20" fill="#ffffff"/>
      <rect x="74" y="260" width="390" height="126" rx="20" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
      ${descriptionText}
      <rect x="74" y="492" width="390" height="2" rx="1" fill="#dbeafe"/>
      <text x="74" y="548" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#64748b">작성자: ${escapeSvgText(username)}</text>
      <text x="464" y="548" text-anchor="end" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#1e3a8a">항해일지</text>
      <rect x="600" y="0" width="600" height="630" fill="#dbeafe"/>
      ${
        hasImage
          ? ""
          : '<text x="900" y="316" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#94a3b8">BoardPort</text>'
      }
    </svg>
  `;
}

/**
 * SVG 정보 패널과 대표 이미지를 합성한 PNG Response 생성
 */
async function createPngResponse(svg: string, imageBuffer: Buffer | null) {
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
      // 외부 이미지 처리 실패 시 텍스트 중심 OG 이미지로 폴백
    }
  }

  const png = await sharp(Buffer.from(svg))
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
 * 게시글 상세 공유 미리보기 이미지 생성 엔트리
 */
export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return createPngResponse(buildFallbackSvg(), null);
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
    return createPngResponse(buildFallbackSvg(), null);
  }

  const categoryName =
    POST_CATEGORY[post.category as PostCategoryType] || post.category;
  const thumbUrl = post.images[0]?.url ? `${post.images[0].url}/public` : null;
  const imageBuffer = await fetchSafeOgImage(thumbUrl);

  return createPngResponse(
    buildPostSvg({
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
