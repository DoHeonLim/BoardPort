/**
 * File Name : app/(app)/streams/[id]/opengraph-image.tsx
 * Description : 방송 상세 동적 OG 이미지 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.13  임도헌   Created   방송 정보(제목, 스트리머, 썸네일)를 포함한 OG 이미지 생성
 * 2026.03.23  임도헌   Modified  잘못된 id 경로는 DB 조회 전 가드해 OG 이미지 라우트 예외 가능성을 줄임
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/[id]/opengraph-image.tsx 에서 app/(app)/streams/[id]/opengraph-image.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.15  임도헌   Modified  Windows 로컬 next/og 폰트 경로 오류 회피를 위한 sharp 기반 PNG 생성
 * 2026.05.15  임도헌   Modified  다시보기 OG 대표 이미지를 방송 카드와 동일하게 최신 ready VOD 썸네일 우선 사용
 * 2026.05.19  임도헌   Modified  상대 썸네일 URL 보정 기준을 NEXT_PUBLIC_APP_URL로 통일
 * 2026.08.21  임도헌   Modified  제한 방송 OG 노출 차단 및 PUBLIC provider 썸네일 signed 변환
 * 2026.08.22  임도헌   Modified  OG 썸네일 조회에 SSRF·응답 크기·픽셀 제한 경계 적용
 */

import sharp from "sharp";
import db from "@/lib/db";
import { resolveStreamThumbnailUrl } from "@/features/stream/service/playback";
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
 * 고정 폭 방송 OG 카드용 텍스트 줄 분리
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
  return lines.length ? lines : ["보드포트 등대방송"];
}

/**
 * 외부 방송 썸네일의 sharp 합성용 Buffer 조회
 */
/**
 * 스트리밍 썸네일 URL의 외부 공유 이미지용 public URL 보정
 */
function normalizeStreamThumbnailUrl(src: string | null | undefined) {
  const trimmed = src?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("https://imagedelivery.net")) {
    return `${trimmed.replace(/\/public$/, "")}/public`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (siteUrl && trimmed.startsWith("/")) {
    try {
      return new URL(trimmed, siteUrl).toString();
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * 잘못된 ID나 삭제된 방송을 위한 기본 BoardPort OG 이미지
 */
function buildFallbackSvg() {
  return `
    <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#020617"/>
      <text x="600" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="78" font-weight="700" fill="#ffffff">BoardPort</text>
      <text x="600" y="352" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#93c5fd">등대방송</text>
    </svg>
  `;
}

/**
 * 방송 정보 오버레이 SVG 생성
 */
function buildStreamOverlaySvg({
  title,
  username,
  badgeText,
  badgeColor,
  hasImage,
}: {
  title: string;
  username: string;
  badgeText: string;
  badgeColor: string;
  hasImage: boolean;
}) {
  const titleText = splitLines(title, 18, 2)
    .map(
      (line, index) =>
        `<text x="82" y="${392 + index * 58}" font-family="Arial, sans-serif" font-size="50" font-weight="700" fill="#ffffff">${escapeSvgText(line)}</text>`
    )
    .join("");

  return `
    <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${hasImage ? "rgba(0,0,0,0.18)" : "#020617"}"/>
      <rect x="0" y="0" width="1200" height="630" fill="url(#streamGradient)"/>
      <defs>
        <linearGradient id="streamGradient" x1="0" y1="630" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#020617" stop-opacity="0.95"/>
          <stop offset="0.55" stop-color="#020617" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#020617" stop-opacity="0.12"/>
        </linearGradient>
      </defs>
      <text x="1070" y="88" text-anchor="end" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff">BoardPort</text>
      <rect x="82" y="284" width="142" height="48" rx="15" fill="${badgeColor}"/>
      <text x="153" y="317" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#ffffff">${badgeText}</text>
      ${titleText}
      <text x="82" y="548" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#bfdbfe">방송국: ${escapeSvgText(username)}</text>
    </svg>
  `;
}

/**
 * 방송 썸네일과 오버레이를 합성한 PNG Response 생성
 */
async function createPngResponse(svg: string, imageBuffer: Buffer | null) {
  const composites: sharp.OverlayOptions[] = [];

  if (imageBuffer) {
    try {
      // 방송 썸네일은 전체 배경으로 cover 합성
      const thumbnail = await sharp(imageBuffer, {
        limitInputPixels: SAFE_OG_IMAGE_MAX_PIXELS,
        failOn: "warning",
      })
        .resize(size.width, size.height, { fit: "cover", position: "centre" })
        .png()
        .toBuffer();
      composites.push({ input: thumbnail, left: 0, top: 0 });
    } catch {
      // 외부 이미지 처리 실패 시 그라데이션 텍스트 카드로 폴백
    }
  }

  composites.push({ input: Buffer.from(svg), left: 0, top: 0 });

  const png = await sharp({
    create: {
      width: size.width,
      height: size.height,
      channels: 4,
      background: "#020617",
    },
  })
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
 * 방송 상세 공유 미리보기 이미지 생성 엔트리
 */
export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  if (!Number.isFinite(id) || id <= 0) {
    return createPngResponse(buildFallbackSvg(), null);
  }

  const stream = await db.broadcast.findUnique({
    where: { id },
    select: {
      title: true,
      thumbnail: true,
      status: true,
      visibility: true,
      vodAssets: {
        where: { ready_at: { not: null } },
        select: { provider_asset_id: true, thumbnail_url: true },
        orderBy: [{ ready_at: "desc" }, { id: "desc" }],
        take: 1,
      },
      liveInput: {
        select: {
          provider_uid: true,
          user: { select: { username: true } },
        },
      },
    },
  });

  if (!stream || stream.visibility !== "PUBLIC") {
    return createPngResponse(buildFallbackSvg(), null);
  }

  const isLive = stream.status === "CONNECTED";
  const badgeText = isLive ? "LIVE" : "다시보기";
  const badgeColor = isLive ? "#ef4444" : "#2563eb";
  // PUBLIC의 저장된 provider 썸네일도 원본 UID 대신 단기 token URL로 가져온다.
  const latestVod = stream.vodAssets[0];
  let thumbnailCandidate: string | null = null;
  try {
    thumbnailCandidate = resolveStreamThumbnailUrl(
      latestVod?.thumbnail_url ?? stream.thumbnail,
      latestVod?.provider_asset_id ?? stream.liveInput.provider_uid
    );
  } catch (error) {
    console.warn("[StreamOG] signed thumbnail unavailable:", error);
  }
  const thumbUrl = normalizeStreamThumbnailUrl(thumbnailCandidate);
  const imageBuffer = await fetchSafeOgImage(thumbUrl);

  return createPngResponse(
    buildStreamOverlaySvg({
      title: stream.title,
      username: stream.liveInput.user.username,
      badgeText,
      badgeColor,
      hasImage: !!imageBuffer,
    }),
    imageBuffer
  );
}
