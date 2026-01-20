/**
 * File Name : app/api/user-products/initial/route
 * Description : 클라이언트에서 초기 제품 목록(스코프별 1페이지)을 안전하게 가져오기 위한 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.03  임도헌   Created   클라이언트 호출용 초기 목록 API 추가(서버 전용 함수 우회)
 * 2026.01.04  임도헌   Modified  Prisma Route Handler runtime=nodejs 명시
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import getSession from "@/lib/session";
import {
  getInitialUserProducts,
  type UserProductsScope,
} from "@/features/product/lib/getUserProducts";

export const runtime = "nodejs";

const BodySchema = z.object({
  type: z.enum(["SELLING", "RESERVED", "SOLD", "PURCHASED"]),
  userId: z.number().int().positive(),
});

function canAccess(scope: z.infer<typeof BodySchema>, viewerId: number | null) {
  // RESERVED, PURCHASED는 본인만 허용
  if (scope.type === "RESERVED" || scope.type === "PURCHASED") {
    return viewerId != null && viewerId === scope.userId;
  }
  // SELLING, SOLD는 공개
  return true;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid body" },
        { status: 400 }
      );
    }

    const session = await getSession().catch(() => null);
    const viewerId = session?.id ?? null;

    if (!canAccess(parsed.data, viewerId)) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const scope: UserProductsScope = {
      type: parsed.data.type,
      userId: parsed.data.userId,
    };

    const data = await getInitialUserProducts(scope);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[API] /api/user-products/initial error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
