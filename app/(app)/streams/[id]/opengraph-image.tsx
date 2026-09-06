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
 * 2026.08.23  임도헌   Modified  상대 썸네일 URL을 공용 trusted origin과 로컬 fallback으로 보정
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 * 2026.08.30  임도헌   Modified  Next.js 16에서 비동기로 전달되는 방송 경로 정보 처리 보완
 * 2026.08.31  임도헌   Modified  로컬 Pretendard 글꼴 합성으로 운영 OG 이미지 한글 깨짐 방지
 * 2026.09.01  임도헌   Modified  Vercel 서버 렌더러와 호환되는 OTF 한글 글꼴 적용
 * 2026.09.01  임도헌   Modified  공백 없는 긴 방송 제목의 카드 영역 내 줄바꿈 보완
 */

import sharp, { type OverlayOptions } from "sharp";
import db from "@/lib/db";
import { resolveStreamThumbnailUrl } from "@/features/stream/service/playback";
import {
  fetchSafeOgImage,
  SAFE_OG_IMAGE_MAX_PIXELS,
} from "@/lib/media/safeImageFetch";
import { getTrustedAppBaseUrl } from "@/lib/env";
import {
  createOgTextOverlays,
  splitOgTextLines,
  type OgCard,
  type OgTextSpec,
} from "@/lib/media/ogText";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

  if (trimmed.startsWith("/")) {
    try {
      return new URL(trimmed, getTrustedAppBaseUrl()).toString();
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * 잘못된 ID나 삭제된 방송을 위한 기본 BoardPort OG 이미지
 */
function buildFallbackCard() {
  return {
    svg: `
      <svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#020617"/>
      </svg>
    `,
    texts: [
      {
        text: "BoardPort",
        x: 600,
        baseline: 292,
        fontSize: 78,
        color: "#ffffff",
        anchor: "middle",
      },
      {
        text: "등대방송",
        x: 600,
        baseline: 352,
        fontSize: 30,
        color: "#93c5fd",
        anchor: "middle",
      },
    ],
  } satisfies OgCard;
}

/**
 * 방송 정보 오버레이의 도형과 글꼴 텍스트 사양 생성
 */
function buildStreamOverlayCard({
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
  const texts: OgTextSpec[] = [
    {
      text: "BoardPort",
      x: 1070,
      baseline: 88,
      fontSize: 30,
      color: "#ffffff",
      anchor: "end",
    },
    {
      text: badgeText,
      x: 153,
      baseline: 317,
      fontSize: 25,
      color: "#ffffff",
      anchor: "middle",
    },
    ...splitOgTextLines(title, 18, 2, "보드포트 등대방송").map(
      (line, index) => ({
        text: line,
        x: 82,
        baseline: 392 + index * 58,
        fontSize: 50,
        color: "#ffffff",
      })
    ),
    {
      text: `방송국: ${username}`,
      x: 82,
      baseline: 548,
      fontSize: 30,
      color: "#bfdbfe",
    },
  ];

  return {
    svg: `
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
        <rect x="82" y="284" width="142" height="48" rx="15" fill="${badgeColor}"/>
      </svg>
    `,
    texts,
  } satisfies OgCard;
}

/**
 * 방송 썸네일과 오버레이를 합성한 PNG Response 생성
 */
async function createPngResponse(card: OgCard, imageBuffer: Buffer | null) {
  const composites: OverlayOptions[] = [];

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

  composites.push({ input: Buffer.from(card.svg), left: 0, top: 0 });
  composites.push(...(await createOgTextOverlays(card.texts)));

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
 * Next.js가 비동기로 전달하는 방송 ID를 해석해 공유 이미지를 생성
 *
 * @param params - 방송 ID를 담은 비동기 경로 정보
 * @returns 방송 정보 또는 기본 안내 화면을 합성한 PNG 응답
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
    return createPngResponse(buildFallbackCard(), null);
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
    buildStreamOverlayCard({
      title: stream.title,
      username: stream.liveInput.user.username,
      badgeText,
      badgeColor,
      hasImage: !!imageBuffer,
    }),
    imageBuffer
  );
}
