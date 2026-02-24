/**
 * File Name : app/posts/[id]/opengraph-image.tsx
 * Description : 게시글 상세 동적 OG 이미지 생성
 * Author : 임도헌
 *
 * History
 * 2026.02.13  임도헌   Created   게시글 정보(제목, 내용, 작성자, 썸네일)를 포함한 OG 이미지 생성
 */

import { ImageResponse } from "next/og";
import db from "@/lib/db";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";

export const runtime = "nodejs";

export const alt = "보드포트 게시글 미리보기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // 1. 게시글 정보 조회
  const post = await db.post.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      category: true,
      images: {
        take: 1,
        orderBy: { order: "asc" },
        select: { url: true },
      },
      user: {
        select: { username: true, avatar: true },
      },
    },
  });

  if (!post) {
    return new ImageResponse(
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
        BoardPort Post
      </div>,
      { ...size }
    );
  }

  // 카테고리명 변환
  const categoryName =
    POST_CATEGORY[post.category as PostCategoryType] || post.category;

  // 썸네일 이미지 (없으면 기본 배경)
  const thumbUrl = post.images[0]?.url
    ? post.images[0].url.replace(/\/public$/, "") + "/public"
    : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f8fafc", // bg-slate-50
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* 배경 이미지 (있는 경우) */}
      {thumbUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
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

      {/* 콘텐츠 영역 (좌측 50% 또는 전체) */}
      <div
        style={{
          width: thumbUrl ? "50%" : "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
          backgroundColor: "#ffffff",
          zIndex: 10,
          boxShadow: thumbUrl ? "10px 0 30px rgba(0,0,0,0.1)" : "none",
        }}
      >
        {/* 카테고리 뱃지 */}
        <div
          style={{
            backgroundColor: "#e0f2fe", // sky-100
            color: "#0369a1", // sky-700
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

        {/* 제목 */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#0f172a", // slate-900
            lineHeight: 1.2,
            marginBottom: "24px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.title}
        </div>

        {/* 본문 요약 (이미지가 없을 때만 더 길게 보여줌) */}
        <div
          style={{
            fontSize: 28,
            color: "#64748b", // slate-500
            lineHeight: 1.5,
            marginBottom: "40px",
            display: "-webkit-box",
            WebkitLineClamp: thumbUrl ? 2 : 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.description || ""}
        </div>

        {/* 작성자 정보 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginTop: "auto",
          }}
        >
          {post.user.avatar && (
            /* eslint-disable-next-line @next/next/no-img-element */
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ fontSize: 24, fontWeight: "bold", color: "#1e293b" }}
            >
              {post.user.username}
            </span>
            <span style={{ fontSize: 18, color: "#94a3b8" }}>
              BoardPort 항해일지
            </span>
          </div>
        </div>
      </div>
    </div>,
    { ...size }
  );
}
