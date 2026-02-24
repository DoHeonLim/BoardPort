/**
 * File Name : app/products/view/[id]/opengraph-image.tsx
 * Description : 상품 상세 동적 OG 이미지 생성
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.13  임도헌   Created   상품 정보(제목, 가격, 이미지)를 포함한 OG 이미지 생성
 */

import { ImageResponse } from "next/og";
import db from "@/lib/db";
import { formatToWon } from "@/lib/utils";

// Node.js 런타임 사용 (Prisma DB 접속)
export const runtime = "nodejs";

export const alt = "보드포트 상품 상세";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // 1. 상품 정보 조회
  const product = await db.product.findUnique({
    where: { id },
    select: {
      title: true,
      price: true,
      purchase_userId: true,
      reservation_userId: true,
      images: {
        take: 1,
        orderBy: { order: "asc" },
        select: { url: true },
      },
      user: {
        select: { username: true },
      },
    },
  });

  if (!product) {
    // 상품이 없을 때 기본 이미지 반환
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
          BoardPort
        </div>
      ),
      { ...size }
    );
  }

  // 상태 텍스트
  const isSold = !!product.purchase_userId;
  const isReserved = !!product.reservation_userId && !isSold;
  const statusText = isSold ? "판매완료" : isReserved ? "예약중" : "판매중";
  const statusColor = isSold ? "#64748b" : isReserved ? "#16a34a" : "#3b82f6"; // Slate / Green / Blue

  // 이미지 URL (Cloudflare variant 제거 후 원본 사용 권장)
  const rawImage = product.images[0]?.url;
  const imageUrl = rawImage ? `${rawImage}/public` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#f8fafc", // bg-slate-50
          fontFamily: "sans-serif", // 기본 폰트 (한글 폰트는 별도 로드 필요하나 복잡성 줄이기 위해 시스템 폰트 의존)
        }}
      >
        {/* 좌측 이미지 영역 */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#e2e8f0",
            overflow: "hidden",
          }}
        >
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={product.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div style={{ fontSize: 64, color: "#94a3b8" }}>No Image</div>
          )}
        </div>

        {/* 우측 정보 영역 */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px",
            backgroundColor: "#ffffff",
          }}
        >
          {/* 상태 배지 */}
          <div
            style={{
              display: "flex",
              backgroundColor: statusColor,
              borderRadius: "12px",
              padding: "8px 20px",
              marginBottom: "20px",
              width: "fit-content",
            }}
          >
            <span style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
              {statusText}
            </span>
          </div>

          {/* 제목 */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.2,
              marginBottom: "20px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.title}
          </div>

          {/* 가격 */}
          <div
            style={{
              fontSize: 40,
              fontWeight: "bold",
              color: "#1e3a8a", // brand color
              marginBottom: "40px",
            }}
          >
            {formatToWon(product.price)}원
          </div>

          {/* 판매자 및 로고 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            <div style={{ fontSize: 24, color: "#64748b" }}>
              판매자: {product.user.username}
            </div>
            <div style={{ fontSize: 28, color: "#1e3a8a", fontWeight: "bold" }}>
              BoardPort ⚓
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
