/**
 * File Name : app/api/profile/likes/route.ts
 * Description : 사용자 찜한 게시글·다시보기 목록 API
 * Author : 임도헌
 */
import { NextRequest, NextResponse } from "next/server";
import getSession from "@/lib/session";
import {
  getLikedPostsPage,
  getLikedRecordingsPage,
} from "@/features/user/service/myLikes";
import type { MyLikesCursor } from "@/features/user/types";

function parseCursor(
  idValue: string | null,
  likedAtValue: string | null
): MyLikesCursor | null {
  if (!idValue || !likedAtValue) return null;
  const id = Number(idValue);
  const likedAt = new Date(likedAtValue);
  if (!Number.isSafeInteger(id) || id <= 0 || Number.isNaN(likedAt.getTime())) {
    return null;
  }
  return { id, likedAt: likedAt.toISOString() };
}

/** 현재 사용자의 찜한 게시글 또는 다시보기 페이지 반환 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type");
  const rawCursorId = request.nextUrl.searchParams.get("cursorId");
  const rawCursorAt = request.nextUrl.searchParams.get("cursorAt");
  const cursor = parseCursor(rawCursorId, rawCursorAt);
  if ((rawCursorId !== null || rawCursorAt !== null) && !cursor) {
    return NextResponse.json({ error: "BAD_CURSOR" }, { status: 400 });
  }

  if (type === "posts") {
    return NextResponse.json(await getLikedPostsPage(session.id, cursor));
  }
  if (type === "recordings") {
    return NextResponse.json(await getLikedRecordingsPage(session.id, cursor));
  }

  return NextResponse.json({ error: "BAD_TYPE" }, { status: 400 });
}
