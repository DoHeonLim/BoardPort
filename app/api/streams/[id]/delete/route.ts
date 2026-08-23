/**
 * File Name : app/api/streams/[id]/delete/route.ts
 * Description : 방송 삭제 API (소유자 검증) — 비즈니스 로직은 lib/stream/delete/deleteBroadcast 사용
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.15  임도헌   Created   기본 삭제 라우트
 * 2025.09.17  임도헌   Modified  비즈니스 로직 분리: deleteBroadcastTx 호출 구조
 * 2025.11.22  임도헌   Modified  broadcast-list 캐시 태그 제거 및 user-streams-id 태그 무효화 추가
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 * 2026.03.05  임도헌   Modified  방송 목록 갱신용 레거시 `revalidateTag` 제거 및 클라이언트 Query Cache로 무효화 책임 위임
 * 2026.06.22  임도헌   Modified  삭제 후 방송국 경로 서버 캐시도 무효화해 새로고침/직접 진입 상태 보정
 * 2026.08.21  임도헌   Modified  클라이언트 Live Input UID 검증을 제거하고 세션·DB 소유권만으로 삭제 판정
 * 2026.08.22  임도헌   Modified  DB commit 완료 뒤 방송 외부 이미지/VOD 자산을 정리하도록 순서 보강
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  cleanupDeletedBroadcastAssets,
  deleteBroadcastTx,
} from "@/features/stream/service/delete";

export const runtime = "nodejs";

/**
 * DELETE /api/streams/[id]/delete
 * - 세션 소유자와 방송 소유자 일치 여부 확인
 * - 방송 중(CONNECTED)일 경우 삭제 차단
 * - `deleteBroadcastTx` 서비스를 호출하여 DB 삭제 수행
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const idNum = Number(params.id);

    if (!Number.isFinite(idNum)) {
      return NextResponse.json(
        { success: false, error: "잘못된 요청입니다.(id 누락/유효하지 않음)" },
        { status: 400 }
      );
    }

    // 1. 방송 정보 및 소유자 조회
    const row = await db.broadcast.findUnique({
      where: { id: idNum },
      select: {
        id: true,
        status: true,
        liveInput: {
          select: {
            userId: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    if (!row || !row.liveInput) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 방송입니다." },
        { status: 404 }
      );
    }

    // 2. 소유권 검증
    if (row.liveInput.userId !== session.id) {
      return NextResponse.json(
        { success: false, error: "삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 3. 상태 검증 (방송 중 삭제 불가)
    if (row.status?.toUpperCase() === "CONNECTED") {
      return NextResponse.json(
        { success: false, error: "방송 중에는 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    // 4. 삭제 트랜잭션 실행
    const cleanup = await db.$transaction(async (tx) => {
      const res = await deleteBroadcastTx(tx, idNum);
      if (!res.success) {
        throw new Error(res.error || "삭제 실패");
      }
      return res.cleanup;
    });
    if (cleanup) await cleanupDeletedBroadcastAssets(cleanup);

    // 5. 캐시 무효화 (상세 페이지 & 유저 방송 목록)
    try {
      revalidateTag(T.BROADCAST_DETAIL(row.id));
      const username = row.liveInput.user.username;
      revalidatePath(`/profile/${encodeURIComponent(username)}/channel`);
      revalidatePath("/streams");
    } catch (err) {
      console.warn("[DELETE STREAM] revalidateTag failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE STREAM] failed:", err);
    return NextResponse.json(
      { success: false, error: "방송 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
