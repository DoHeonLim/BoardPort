/**
 * File Name : app/streams/[id]/opengraph-image.tsx
 * Description : 방송 상세 동적 OG 이미지 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.13  임도헌   Created   방송 정보(제목, 스트리머, 썸네일)를 포함한 OG 이미지 생성
 */

import { ImageResponse } from "next/og";
import db from "@/lib/db";

export const runtime = "nodejs";

export const alt = "보드포트 방송 미리보기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // 1. 방송 정보 조회
  const stream = await db.broadcast.findUnique({
    where: { id },
    select: {
      title: true,
      thumbnail: true,
      status: true,
      liveInput: {
        select: {
          user: { select: { username: true, avatar: true } },
        },
      },
    },
  });

  if (!stream) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: "#1E3A8A",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
          }}
        >
          BoardPort Live
        </div>
      ),
      { ...size }
    );
  }

  const isLive = stream.status === "CONNECTED";
  // 썸네일이 없으면 기본 배경색 또는 로고 사용
  const thumbUrl = stream.thumbnail
    ? stream.thumbnail.replace(/\/public$/, "") + "/public" // variant 보장
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#000000",
        }}
      >
        {/* 배경 이미지 (어둡게 처리) */}
        {thumbUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.6,
            }}
          />
        )}

        {/* 콘텐츠 오버레이 */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "60px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0))",
          }}
        >
          {/* LIVE 뱃지 */}
          {isLive ? (
            <div
              style={{
                backgroundColor: "#ef4444", // red-500
                color: "white",
                padding: "8px 24px",
                borderRadius: "9999px",
                fontSize: 24,
                fontWeight: "bold",
                marginBottom: "24px",
                width: "fit-content",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: "white",
                }}
              />
              LIVE
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                padding: "8px 24px",
                borderRadius: "9999px",
                fontSize: 24,
                fontWeight: "bold",
                marginBottom: "24px",
                width: "fit-content",
              }}
            >
              다시보기
            </div>
          )}

          {/* 제목 */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "white",
              lineHeight: 1.2,
              marginBottom: "24px",
              textShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            {stream.title}
          </div>

          {/* 스트리머 정보 */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {stream.liveInput.user.avatar && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`${stream.liveInput.user.avatar}/avatar`}
                alt=""
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: "3px solid white",
                }}
              />
            )}
            <div
              style={{
                fontSize: 32,
                color: "white",
                fontWeight: "bold",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              {stream.liveInput.user.username}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
