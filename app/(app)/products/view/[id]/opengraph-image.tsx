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
*/

/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import db from "@/lib/db";
import { formatToWon } from "@/lib/utils";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = `${baseUrl}/images/logo-text.png`;

  if (!Number.isFinite(id) || id <= 0) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#f8fafc",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logoUrl}
            alt="BoardPort"
            style={{ width: 400, objectFit: "contain" }}
          />
        </div>
      ),
      { ...size }
    );
  }

  const product = await db.product.findUnique({
    where: { id },
    select: {
      title: true,
      price: true,
      purchase_userId: true,
      reservation_userId: true,
      images: { take: 1, orderBy: { order: "asc" }, select: { url: true } },
      user: { select: { username: true } },
    },
  });

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#f8fafc",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logoUrl}
            alt="BoardPort"
            style={{ width: 400, objectFit: "contain" }}
          />
        </div>
      ),
      { ...size }
    );
  }

  const isSold = !!product.purchase_userId;
  const isReserved = !!product.reservation_userId && !isSold;
  const statusText = isSold ? "판매완료" : isReserved ? "예약중" : "판매중";
  const statusColor = isSold ? "#64748b" : isReserved ? "#16a34a" : "#3b82f6";
  const imageUrl = product.images[0]?.url
    ? `${product.images[0].url}/public`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            backgroundColor: "#e2e8f0",
            overflow: "hidden",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                fontSize: 64,
                color: "#94a3b8",
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              No Image
            </div>
          )}
        </div>

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
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.2,
              marginBottom: "20px",
              display: "-webkit-box",
            }}
          >
            {product.title}
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: "bold",
              color: "#1e3a8a",
              marginBottom: "40px",
            }}
          >
            {formatToWon(product.price)}원
          </div>
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
            <img
              src={logoUrl}
              alt="BoardPort"
              style={{ height: 40, objectFit: "contain" }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

