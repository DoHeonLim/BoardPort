/**
 * File Name : features/stream/service/liveInput.ts
 * Description : Cloudflare Live Input 관리 서비스 (생성, 조회, 삭제, 키 재발급)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.16  임도헌   Created   서버 액션 생성: getStreamKey(broadcastId) → { rtmpUrl, streamKey }
 * 2025.09.16  임도헌   Modified  StreamSecretInfo.fetchCreds 형식에 맞춰 rtmpUrl 동반 반환, 가드/에러 코드 정리
 * 2026.01.18  임도헌   Modifeid  확장자 변경 (tsx->ts)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.23  임도헌   Merged    LiveInput 관련 로직 통합 및 Session 의존성 제거
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import "server-only";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import {
  GetStreamKeyResult,
  RotateLiveInputKeyResult,
} from "@/features/stream/types";

const API_BASE = "https://api.cloudflare.com/client/v4";
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const AUTH = `Bearer ${CF_TOKEN}`;
const DEFAULT_RTMPS_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_RTMP_URL?.trim() ||
  "rtmps://live.cloudflare.com:443/live/";

/**
 * 유저의 LiveInput(채널)을 보장
 *
 * 1. DB에서 기존 LiveInput을 조회하여 존재하면 즉시 반환
 * 2. 없으면 Cloudflare API를 호출하여 새 LiveInput 생성을 요청
 * 3. 생성된 CF 정보를 DB에 저장
 * 4. [Concurrency] DB 저장 시 `userId` 중복 에러(P2002)가 발생하면,
 *    동시 요청에 의해 이미 생성된 것으로 간주하여 롤백(CF 삭제) 후 DB를 재조회
 *
 * @param userId - 유저 ID
 * @param nameHint - 채널 이름 힌트
 */
export async function ensureLiveInput(userId: number, nameHint: string) {
  // 1. 기존 채널 재사용
  const existing = await db.liveInput.findUnique({
    where: { userId },
    select: { id: true, provider_uid: true, stream_key: true },
  });
  if (existing) {
    return {
      liveInputId: existing.id,
      providerUid: existing.provider_uid,
      streamKey: existing.stream_key,
      rtmpUrl: DEFAULT_RTMPS_URL,
      created: false,
    };
  }

  // 2. 없으면 CF 생성 요청
  if (!CF_ACCOUNT_ID || !CF_TOKEN) {
    throw new Error("Cloudflare 환경변수가 설정되지 않았습니다.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let uid = "";
  let rtmpUrl = DEFAULT_RTMPS_URL;
  let streamKey = "";

  try {
    const res = await fetch(
      `${API_BASE}/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: "POST",
        headers: { Authorization: AUTH, "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          meta: { name: nameHint },
          recording: { mode: "automatic" },
        }),
      }
    );

    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data?.result) {
      throw new Error(`Cloudflare Live Input 생성 실패 (${res.status})`);
    }

    uid = data.result?.uid ?? "";
    rtmpUrl = data.result?.rtmps?.url ?? DEFAULT_RTMPS_URL;
    streamKey = data.result?.rtmps?.streamKey ?? "";
  } finally {
    clearTimeout(timeout);
  }

  // 3. DB 저장 및 충돌 처리
  try {
    const created = await db.liveInput.create({
      data: {
        userId,
        provider_uid: uid,
        stream_key: streamKey,
        name: "메인 채널",
      },
      select: { id: true, provider_uid: true, stream_key: true },
    });
    return {
      liveInputId: created.id,
      providerUid: created.provider_uid,
      streamKey: created.stream_key,
      rtmpUrl,
      created: true,
    };
  } catch (e) {
    if (isUniqueConstraintError(e, ["userId"])) {
      // 롤백: CF 리소스 정리
      try {
        await fetch(
          `${API_BASE}/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${uid}`,
          { method: "DELETE", headers: { Authorization: AUTH } }
        );
      } catch {}

      // 재조회
      const latest = await db.liveInput.findUnique({
        where: { userId },
        select: { id: true, provider_uid: true, stream_key: true },
      });
      if (!latest) throw e;
      return {
        liveInputId: latest.id,
        providerUid: latest.provider_uid,
        streamKey: latest.stream_key,
        rtmpUrl: DEFAULT_RTMPS_URL,
        created: false,
      };
    }
    throw e;
  }
}

/**
 * LiveInput 삭제
 * 방송 중(CONNECTED)이거나 방송 이력이 있으면 삭제를 차단
 * Cloudflare 리소스도 함께 삭제
 */
export async function deleteLiveInput(liveInputId: number, userId: number) {
  if (!CF_ACCOUNT_ID || !CF_TOKEN)
    return {
      success: false,
      error: "Cloudflare 환경변수가 설정되지 않았습니다.",
    };

  const li = await db.liveInput.findUnique({
    where: { id: liveInputId },
    select: { id: true, userId: true, provider_uid: true },
  });
  if (!li) return { success: false, error: "존재하지 않는 Live Input 입니다." };
  if (li.userId !== userId)
    return { success: false, error: "권한이 없습니다." };

  const active = await db.broadcast.findFirst({
    where: { liveInputId, status: "CONNECTED" },
    select: { id: true },
  });
  if (active)
    return { success: false, error: "방송 중에는 삭제할 수 없습니다." };

  const hasHistory = await db.broadcast.count({ where: { liveInputId } });
  if (hasHistory > 0) {
    return {
      success: false,
      error: "방송 이력이 있어 삭제할 수 없습니다. 키 재발급을 사용하세요.",
    };
  }

  // CF 삭제 (404는 성공으로 간주)
  if (li.provider_uid) {
    const res = await fetch(
      `${API_BASE}/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${li.provider_uid}`,
      { method: "DELETE", headers: { Authorization: AUTH } }
    );
    if (!res.ok && res.status !== 404) {
      return { success: false, error: `Live Input 삭제 실패 (${res.status})` };
    }
  }

  await db.liveInput.delete({ where: { id: liveInputId } });
  return { success: true };
}

/**
 * 방송 소유자에게 스트림 키 정보를 반환
 */
export async function getStreamKey(
  broadcastId: number,
  userId: number
): Promise<GetStreamKeyResult> {
  const b = await db.broadcast.findUnique({
    where: { id: broadcastId },
    select: {
      liveInput: { select: { userId: true, stream_key: true } },
    },
  });

  if (!b?.liveInput) return { success: false, error: "NOT_FOUND" };
  if (b.liveInput.userId !== userId)
    return { success: false, error: "FORBIDDEN" };

  return {
    success: true,
    rtmpUrl: DEFAULT_RTMPS_URL,
    streamKey: b.liveInput.stream_key,
  };
}

/**
 * 스트림 키 재발급 (Rotate)
 *
 * [보안 정책]
 * - 기존 키를 무효화하기 위해, 기존 CF LiveInput을 삭제하고 새로 생성
 * - DB 레코드는 삭제하지 않고 `provider_uid`와 `stream_key`만 업데이트
 * - 방송 중(`CONNECTED`)에는 키 재발급을 차단
 */
export async function rotateLiveInputKey(
  liveInputId: number,
  userId: number
): Promise<RotateLiveInputKeyResult> {
  if (!CF_ACCOUNT_ID || !CF_TOKEN)
    return {
      success: false,
      error: "Cloudflare 환경변수가 설정되지 않았습니다.",
    };

  const liveInput = await db.liveInput.findUnique({
    where: { id: liveInputId },
    select: { id: true, userId: true, provider_uid: true, name: true },
  });

  if (!liveInput)
    return { success: false, error: "존재하지 않는 Live Input 입니다." };
  if (liveInput.userId !== userId)
    return { success: false, error: "권한이 없습니다." };

  const active = await db.broadcast.findFirst({
    where: { liveInputId, status: "CONNECTED" },
    select: { id: true },
  });
  if (active)
    return { success: false, error: "방송 중에는 키를 재발급할 수 없습니다." };

  // 1. 기존 삭제
  if (liveInput.provider_uid) {
    const delRes = await fetch(
      `${API_BASE}/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${liveInput.provider_uid}`,
      { method: "DELETE", headers: { Authorization: AUTH } }
    );
    if (!delRes.ok && delRes.status !== 404) {
      return {
        success: false,
        error: `Live Input 삭제 실패 (${delRes.status})`,
      };
    }
  }

  // 2. 재생성
  const createRes = await fetch(
    `${API_BASE}/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`,
    {
      method: "POST",
      headers: { Authorization: AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({
        meta: { name: liveInput.name || `live-input-${liveInput.id}` },
        recording: { mode: "automatic" },
      }),
    }
  );

  const data = await createRes.json().catch(() => ({} as any));
  if (!createRes.ok || !data?.result) {
    return {
      success: false,
      error: `새 Live Input 생성 실패 (${createRes.status})`,
    };
  }

  const newUid = data.result.uid;
  const newRtmpUrl = data.result.rtmps?.url;
  const newStreamKey = data.result.rtmps?.streamKey;

  // 3. DB 업데이트
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
