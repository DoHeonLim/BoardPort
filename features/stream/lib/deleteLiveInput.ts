/**
 * File Name : features/stream/lib/deleteLiveInput.ts
 * Description : Cloudflare Live Input 삭제 및 DB 정리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.21  임도헌   Created   Live Input 삭제(404 무시), DB stream_id/stream_key 초기화
 * 2026.01.19  임도헌   Moved      lib/stream -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";
import getSession from "@/lib/session";

type DeleteResult = { success: boolean; error?: string };

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const AUTH = `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`;

export async function deleteLiveInput(
  liveInputId: number
): Promise<DeleteResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };
  if (!ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    return {
      success: false,
      error: "Cloudflare 환경변수가 설정되지 않았습니다.",
    };
  }

  const li = await db.liveInput.findUnique({
    where: { id: liveInputId },
    select: { id: true, userId: true, provider_uid: true },
  });
  if (!li) return { success: false, error: "존재하지 않는 Live Input 입니다." };
  if (li.userId !== session.id)
    return { success: false, error: "권한이 없습니다." };

  // CONNECTED 방송 존재 시 삭제 차단 (안전)
  const active = await db.broadcast.findFirst({
    where: { liveInputId, status: "CONNECTED" },
    select: { id: true },
  });
  if (active)
    return { success: false, error: "방송 중에는 삭제할 수 없습니다." };

  // 과거 방송 이력 있는 경우 UX 정책에 따라 차단/허용 결정 (여기서는 차단)
  const hasHistory = await db.broadcast.count({ where: { liveInputId } });
  if (hasHistory > 0) {
    return {
      success: false,
      error: "방송 이력이 있어 삭제할 수 없습니다. 키 재발급을 사용하세요.",
    };
  }

  // Cloudflare Live Input 삭제 (404 허용)
  if (li.provider_uid) {
    const headers = { Authorization: AUTH, "Content-Type": "application/json" };
    const res = await fetch(
      `${API_BASE}/accounts/${ACCOUNT_ID}/stream/live_inputs/${li.provider_uid}`,
      { method: "DELETE", headers, cache: "no-store" }
    );
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => "");
      return {
        success: false,
        error: `Live Input 삭제 실패 (${res.status})${body ? `: ${body}` : ""}`,
      };
    }
  }

  // DB 삭제 (Broadcast/VodAsset이 없으므로 안전)
  await db.liveInput.delete({ where: { id: liveInputId } });

  return { success: true };
}
