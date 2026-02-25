/**
 * File Name : app/posts/[id]/opengraph-image.tsx
 * Description : 게시글 상세 동적 OG 이미지 생성
 * Author : 임도헌
 *
 * History
 * 2026.02.13  임도헌   Created   게시글 정보(제목, 내용, 작성자, 썸네일)를 포함한 OG 이미지 생성
 */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import db from "@/lib/db";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };

export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoTextUrl = `${baseUrl}/images/logo-text.png`;
  const logoSymbolUrl = `${baseUrl}/images/logo-symbol.png`;

  const post = await db.post.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      category: true,
      images: { take: 1, orderBy: { order: "asc" }, select: { url: true } },
      user: { select: { username: true, avatar: true } },
    },
  });

  if (!post) {
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
            src={logoTextUrl}
            alt="BoardPort"
            style={{ width: 400, objectFit: "contain" }}
          />
        </div>
      ),
      { ...size }
    );
  }

  const categoryName =
    POST_CATEGORY[post.category as PostCategoryType] || post.category;
  const thumbUrl = post.images[0]?.url ? `${post.images[0].url}/public` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#f8fafc",
          position: "relative",
        }}
      >
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "50%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.9,
            }}
          />
        )}

        <div
          style={{
            width: thumbUrl ? "55%" : "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px",
            backgroundColor: "#ffffff",
            zIndex: 10,
            boxShadow: thumbUrl ? "20px 0 40px rgba(0,0,0,0.1)" : "none",
          }}
        >
          <div
            style={{
              backgroundColor: "#e0f2fe",
              color: "#0369a1",
              padding: "8px 20px",
              borderRadius: "9999px",
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: "24px",
              width: "fit-content",
            }}
          >
            {categoryName}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.2,
              marginBottom: "24px",
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#64748b",
              lineHeight: 1.5,
              marginBottom: "40px",
            }}
          >
            {post.description?.slice(0, 120)}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {post.user.avatar && (
                <img
                  src={`${post.user.avatar}/avatar`}
                  alt=""
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              )}
              <span
                style={{ fontSize: 24, fontWeight: "bold", color: "#1e293b" }}
              >
                {post.user.username}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={logoSymbolUrl}
                alt=""
                style={{ width: 32, height: 32 }}
              />
              <span
                style={{ fontSize: 20, color: "#94a3b8", fontWeight: "bold" }}
              >
                BoardPort 항해일지
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
