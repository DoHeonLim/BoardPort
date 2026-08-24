/**
 * File Name : app/(app)/products/view/[id]/opengraph-image.tsx
 * Description : 상품 상세 동적 OG 이미지 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.13  임도헌   Created   상품 정보(제목, 가격, 이미지)를 포함한 OG 이미지 생성
 * 2026.02.25  임도헌   Modified   OG 이미지에 텍스트 대신 새 로고(logo-text.png) 적용
 * 2026.03.23  임도헌   Modified  잘못된 id 경로는 DB 조회 전 가드해 OG 이미지 라우트 예외 가능성을 줄임
 * 2026.04.12  임도헌   Moved     파일 경로를 app/products/view/[id]/opengraph-image.tsx 에서 app/(app)/products/view/[id]/opengraph-image.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.15  임도헌   Modified  Windows 로컬 next/og 폰트 경로 오류 회피를 위한 sharp 기반 PNG 생성
 * 2026.08.22  임도헌   Modified  OG 대표 이미지 조회에 SSRF·응답 크기·픽셀 제한 경계 적용
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import sharp, { type OverlayOptions } from "sharp";
import db from "@/lib/db";
import { formatToWon } from "@/lib/utils";
import {
  fetchSafeOgImage,
  SAFE_OG_IMAGE_MAX_PIXELS,
} from "@/lib/media/safeImageFetch";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FALLBACK_LOGO_TEXT = "BoardPort";

/**
 * DB 문자열을 SVG text node에 안전하게 넣기 위한 최소 escape 처리
 */
function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * OG 이미지처럼 폭이 고정된 영역에서 텍스트가 넘치지 않도록 문자 수 기준 줄 분리
 * 한글/영문 폭 차이를 정확히 재지는 않지만, 공유 카드의 안정적인 폴백으로 충분한 예측 가능성 확보
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

  return lines.length ? lines : [FALLBACK_LOGO_TEXT];
}

/**
 * 외부 상품 이미지를 sharp 합성용 Buffer로 조회
 * Cloudflare 이미지 장애나 만료 URL 발생 시 카드 전체 실패 대신 텍스트 카드 폴백
 */
/**
 * 잘못된 ID나 삭제된 상품을 위한 기본 BoardPort OG 이미지
 */
function buildFallbackSvg() {
  return `
    <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#f8fafc"/>
      <text x="600" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="78" font-weight="700" fill="#1e3a8a">BoardPort</text>
      <text x="600" y="352" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#64748b">모든 게임이 모이는 곳</text>
    </svg>
  `;
}

/**
 * 상품 정보 영역 SVG 생성
 * 실제 상품 이미지는 sharp composite 단계에서 왼쪽 절반에 합성하므로, 여기서는 우측 정보 패널과 fallback만 구성
 */
function buildProductSvg({
  title,
  description,
  price,
  seller,
  statusText,
  statusColor,
  hasImage,
}: {
  title: string;
  description: string;
  price: number;
  seller: string;
  statusText: string;
  statusColor: string;
  hasImage: boolean;
}) {
  const titleLines = splitLines(title, 14, 2);
  const descriptionLines = splitLines(description, 17, 3);
  const titleText = titleLines
    .map(
      (line, index) =>
        `<text x="682" y="${180 + index * 48}" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#0f172a">${escapeSvgText(line)}</text>`
    )
    .join("");
  const descriptionText = descriptionLines
    .map(
      (line, index) =>
        `<text x="682" y="${304 + index * 33}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#64748b">${escapeSvgText(line)}</text>`
    )
    .join("");

  return `
    <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#f8fafc"/>
      <rect x="0" y="0" width="600" height="630" fill="#dbeafe"/>
      ${
        hasImage
          ? ""
          : '<text x="300" y="316" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#94a3b8">No Image</text>'
      }
      <rect x="600" y="0" width="600" height="630" fill="#ffffff"/>
      <rect x="636" y="44" width="500" height="542" rx="30" fill="#f8fafc"/>
      <rect x="636" y="44" width="500" height="542" rx="30" fill="none" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="682" y="82" width="132" height="44" rx="14" fill="${statusColor}"/>
      <text x="748" y="113" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${statusText}</text>
      ${titleText}
      <rect x="682" y="264" width="386" height="118" rx="20" fill="#ffffff"/>
      <rect x="682" y="264" width="386" height="118" rx="20" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
      ${descriptionText}
      <text x="682" y="454" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#1e3a8a">${formatToWon(price)}원</text>
      <rect x="682" y="498" width="386" height="2" rx="1" fill="#dbeafe"/>
      <text x="682" y="552" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#64748b">판매자: ${escapeSvgText(seller)}</text>
      <text x="1068" y="552" text-anchor="end" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="#1e3a8a">BoardPort</text>
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
      // 공유 카드에서 대표 이미지 영역이 비지 않도록 왼쪽 절반에 cover 합성
      const productImage = await sharp(imageBuffer, {
        limitInputPixels: SAFE_OG_IMAGE_MAX_PIXELS,
        failOn: "warning",
      })
        .resize(600, 630, { fit: "cover", position: "centre" })
        .png()
        .toBuffer();
      composites.push({ input: productImage, left: 0, top: 0 });
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
 * 제품 상세 공유 미리보기 이미지 생성 엔트리
 * next/og의 Windows 로컬 폰트 경로 오류 회피를 위한 sharp 직접 PNG 생성 경로
 */
export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return createPngResponse(buildFallbackSvg(), null);
  }

  const product = await db.product.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      price: true,
      purchase_userId: true,
      reservation_userId: true,
      images: { take: 1, orderBy: { order: "asc" }, select: { url: true } },
      user: { select: { username: true } },
    },
  });

  if (!product) {
    return createPngResponse(buildFallbackSvg(), null);
  }

  const isSold = !!product.purchase_userId;
  const isReserved = !!product.reservation_userId && !isSold;
  const statusText = isSold ? "판매완료" : isReserved ? "예약중" : "판매중";
  const statusColor = isSold ? "#64748b" : isReserved ? "#16a34a" : "#3b82f6";
  const imageUrl = product.images[0]?.url
    ? `${product.images[0].url}/public`
    : null;
  const imageBuffer = await fetchSafeOgImage(imageUrl);

  return createPngResponse(
    buildProductSvg({
      title: product.title,
      description:
        product.description?.trim().replace(/\s+/g, " ") ||
        "보드포트 상품 상세를 확인해보세요.",
      price: product.price,
      seller: product.user.username,
      statusText,
      statusColor,
      hasImage: !!imageBuffer,
    }),
    imageBuffer
  );
}
