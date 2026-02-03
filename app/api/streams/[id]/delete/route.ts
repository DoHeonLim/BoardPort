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
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { deleteBroadcastTx } from "@/features/stream/service/delete";

export const runtime = "nodejs";

/**
 * DELETE /api/streams/[id]/delete
 * - `uid` 쿼리 파라미터로 Live Input UID 검증 (선택적)
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

    const search = new URL(req.url).searchParams;
    const uid = search.get("uid") || ""; // LiveInput.provider_uid (선택 검증)
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
        liveInput: { select: { userId: true, provider_uid: true } },
      },
    });

    if (!row || !row.liveInput) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 방송입니다." },
        { status: 404 }
      );
    }

    // 2. UID 교차 검증 (보안 강화)
    if (uid && uid !== row.liveInput.provider_uid) {
      return NextResponse.json(
        { success: false, error: "잘못된 요청입니다.(uid 불일치)" },
        { status: 400 }
      );
    }

    // 3. 소유권 검증
    if (row.liveInput.userId !== session.id) {
      return NextResponse.json(
        { success: false, error: "삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 4. 상태 검증 (방송 중 삭제 불가)
    if (row.status?.toUpperCase() === "CONNECTED") {
      return NextResponse.json(
        { success: false, error: "방송 중에는 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    // 5. 삭제 트랜잭션 실행
    await db.$transaction(async (tx) => {
      const res = await deleteBroadcastTx(tx, idNum);
      if (!res.success) {
        throw new Error(res.error || "삭제 실패");
      }
    });

    // 6. 캐시 무효화 (상세 페이지 & 유저 방송 목록)
    try {
      revalidateTag(T.BROADCAST_DETAIL(row.id));
      if (row.liveInput?.userId) {
        revalidateTag(T.USER_STREAMS_ID(row.liveInput.userId));
      }
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
