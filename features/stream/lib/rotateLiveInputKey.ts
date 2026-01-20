/**
 * File Name : features/stream/lib/rotateLiveInputKey.ts
 * Description : Cloudflare Live Input 키 재발급 (삭제 시도 후 새 Input 생성; 404면 삭제 생략)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.19  임도헌   Created   키 재발급(삭제+재생성) 로직
 * 2025.08.19  임도헌   Modified  404일 때 삭제 생략 → 새 Input 생성만 진행 (문서 명세 반영)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";
import getSession from "@/lib/session";

type RotateResult = {
  success: boolean;
  rtmpUrl?: string;
  streamKey?: string;
  error?: string;
};

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const AUTH = `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`;

export async function rotateLiveInputKey(
  liveInputId: number
): Promise<RotateResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };
  if (!ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    return {
      success: false,
      error: "Cloudflare 환경변수가 설정되지 않았습니다.",
    };
  }

  // 내 리소스인지 확인 + 현재 방송 중인지 확인
  const liveInput = await db.liveInput.findUnique({
    where: { id: liveInputId },
    select: {
      id: true,
      userId: true,
      provider_uid: true,
      name: true,
    },
  });
  if (!liveInput)
    return { success: false, error: "존재하지 않는 Live Input 입니다." };
  if (liveInput.userId !== session.id)
    return { success: false, error: "권한이 없습니다." };

  // CONNECTED 방송이 있는 경우 차단
  const active = await db.broadcast.findFirst({
    where: { liveInputId, status: "CONNECTED" },
    select: { id: true },
  });
  if (active)
    return { success: false, error: "방송 중에는 키를 재발급할 수 없습니다." };

  const headers = { Authorization: AUTH, "Content-Type": "application/json" };

  // 1) 기존 Live Input 삭제 시도 (404는 이미 없음으로 간주)
  if (liveInput.provider_uid) {
    const delRes = await fetch(
      `${API_BASE}/accounts/${ACCOUNT_ID}/stream/live_inputs/${liveInput.provider_uid}`,
      { method: "DELETE", headers, cache: "no-store" }
    );
    if (!delRes.ok && delRes.status !== 404) {
      const body = await delRes.text().catch(() => "");
      return {
        success: false,
        error: `Live Input 삭제 실패 (${delRes.status})${body ? `: ${body}` : ""}`,
      };
    }
  }

  // 2) 새 Live Input 생성
  const createRes = await fetch(
    `${API_BASE}/accounts/${ACCOUNT_ID}/stream/live_inputs`,
    {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        meta: { name: liveInput.name || `live-input-${liveInput.id}` },
        recording: { mode: "automatic" },
      }),
    }
  );

  const data = await createRes.json().catch(() => ({}) as any);
  if (!createRes.ok || !data?.result) {
    return {
      success: false,
      error: `새 Live Input 생성 실패 (${createRes.status})`,
    };
  }

  const newUid: string | undefined = data.result?.uid;
  const newRtmpUrl: string | undefined = data.result?.rtmps?.url;
  const newStreamKey: string | undefined = data.result?.rtmps?.streamKey;

  if (!newUid || !newRtmpUrl || !newStreamKey) {
    return {
      success: false,
      error: "생성 응답에 필수 필드(uid/url/streamKey)가 없습니다.",
    };
  }

  // 3) 같은 row를 업데이트 (userId 유니크 정책을 유지)
  await db.liveInput.update({
    where: { id: liveInput.id },
    data: {
      provider_uid: newUid,
      stream_key: newStreamKey,
      status: "DISCONNECTED",
      updated_at: new Date(),
    },
  });

  return { success: true, rtmpUrl: newRtmpUrl, streamKey: newStreamKey };
}
