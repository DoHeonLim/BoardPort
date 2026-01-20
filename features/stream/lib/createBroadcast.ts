/**
 * File Name : features/stream/lib/createBroadcast.ts
 * Description : 스트리밍 생성 로직 (Cloudflare Live Input 보장 + Broadcast 생성 + 채팅방)
 * Author : 임도헌
 *
 * History
 * 2025.07.30  임도헌   Created    streamSchema 분리 적용
 * 2025.08.10  임도헌   Modified   PRIVATE 비밀번호 bcrypt 해시 저장
 * 2025.08.21  임도헌   Modified   서버 전용 ENV 적용/응답 검증/에러 메시지 표준화/불필요 외부호출 방지
 * 2025.09.09  임도헌   Modified   CF 요청 타임아웃/응답 검증 강화를 추가, 태그 정규화/중복제거, 로깅/가드 개선
 * 2025.09.15  임도헌   Modified   LiveInput/Broadcast/VodAsset 스키마 반영, 단일 채널(1인 1 LiveInput) 정책 적용
 * 2025.09.16  임도헌   Modified   내보내기 이름을 createBroadcast로 리네이밍
 * 2025.12.22  임도헌   Modified   Prisma 에러 가드 유틸로 변경
 * 2026.01.02  임도헌   Modified   생성 후 방송국/상세 캐시 태그 무효화 추가
 * 2026.01.19  임도헌   Moved      lib/stream -> features/stream/lib
 *
 * 개요
 * - 유저가 폼 제출 시:
 *   1) 해당 유저의 LiveInput(송출 채널)을 조회/보장. (없으면 CF에 생성 후 DB 저장)
 *   2) Broadcast(한 번의 송출 세션) 레코드를 생성. (제목/설명/공개/카테고리/태그)
 *   3) 세션별 채팅방(StreamChatRoom) 생성. (실패해도 방송은 유지)
 *   4) OBS 안내를 위해 RTMP URL/Stream Key 반환.
 */

import "server-only";
import { hash } from "bcrypt";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { isUniqueConstraintError } from "@/lib/errors";
import { STREAM_VISIBILITY } from "@/lib/constants";
import { streamFormSchema } from "@/features/stream/lib/streamFormSchema";
import { createStreamChatRoom } from "@/features/stream/lib/createStreamChatRoom";
import type { CreateBroadcastResult } from "@/types/stream";

/* 필수 ENV */
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

/* 기본 RTMPS 엔드포인트 (OBS 안내용 폴백) */
const DEFAULT_RTMPS_URL = "rtmps://live.cloudflare.com:443/live/";

/** OBS 연결 전 초기 상태(Cloudflare 기준: 아직 DISCONNECTED) */
const INITIAL_STATUS = "DISCONNECTED";

/**
 * ensureLiveInput
 * - @@unique([userId]) 전제: 1인 1 LiveInput
 *   1) DB에서 userId로 기존 LiveInput 조회
 *   2) 없으면 CF Live Input 생성 → DB insert
 *   3) 동시성으로 Unique 충돌(P2002) 시 CF 자원 정리 후 기존 레코드 재조회
 */
async function ensureLiveInput(userId: number, nameHint: string) {
  // 1) 기존 채널 재사용
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

  // 2) 없으면 CF에 Live Input 생성
  if (!CF_ACCOUNT_ID || !CF_TOKEN) {
    throw new Error("Cloudflare 환경변수가 설정되지 않았습니다.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s

  let uid = "";
  let rtmpUrl = DEFAULT_RTMPS_URL;
  let streamKey = "";

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          meta: { name: nameHint },
          recording: { mode: "automatic" },
        }),
      }
    );

    const data = await res.json().catch(() => ({}) as any);
    if (!res.ok || !data?.result) {
      throw new Error(`Cloudflare Live Input 생성 실패 (${res.status})`);
    }

    uid = data.result?.uid ?? "";
    rtmpUrl = data.result?.rtmps?.url ?? DEFAULT_RTMPS_URL;
    streamKey = data.result?.rtmps?.streamKey ?? "";

    if (!uid || !streamKey) {
      throw new Error("Cloudflare 응답에 uid/streamKey가 없습니다.");
    }
  } finally {
    clearTimeout(timeout);
  }

  // 3) DB 저장(동시성 충돌 처리)
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
  } catch (e: any) {
    if (isUniqueConstraintError(e, ["userId"])) {
      // 다른 요청이 먼저 생성함 → 우리가 방금 만든 CF 자원 정리
      try {
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${uid}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${CF_TOKEN}` } }
        );
      } catch {
        console.warn("[ensureLiveInput] CF cleanup failed for uid:", uid);
      }

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
 * createStream
 * - 폼 검증 → LiveInput 보장 → Broadcast 생성 → 채팅방 생성(실패 무시)
 * - 성공 시 OBS 설정(RTMP/Key) + 식별자 반환
 */
export const createBroadcast = async (
  formData: FormData
): Promise<CreateBroadcastResult> => {
  // 0) 인증
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  // 1) 태그 파싱(중복 제거/최대 5개)
  const raw = (formData.get("tags") as string) || "[]";
  let tagsSafe: string[] = [];
  try {
    const parsed = JSON.parse(raw) as string[];
    const normalized = parsed
      .map((t) => `${t}`.trim())
      .filter(Boolean)
      .map((t) => (t.length > 50 ? t.slice(0, 50) : t));
    tagsSafe = Array.from(new Set(normalized)).slice(0, 5);
  } catch {
    tagsSafe = [];
  }

  // 2) zod 검증
  const parsed = streamFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    thumbnail: formData.get("thumbnail"),
    visibility: formData.get("visibility"),
    password: formData.get("password"),
    streamCategoryId: Number(formData.get("streamCategoryId")),
    tags: tagsSafe,
  });
  if (!parsed.success) {
    return { success: false, error: "입력값이 올바르지 않습니다." };
  }

  const {
    title,
    description,
    thumbnail,
    visibility,
    password,
    streamCategoryId,
    tags,
  } = parsed.data;

  // 3) PRIVATE 비밀번호 해시
  let passwordHash: string | null = null;
  if (visibility === STREAM_VISIBILITY.PRIVATE) {
    const plain = (password ?? "").trim();
    if (!plain) {
      return {
        success: false,
        error: "비공개 스트리밍은 비밀번호가 필요합니다.",
      };
    }
    passwordHash = await hash(plain, 12);
  }

  // 4) 유저 LiveInput 보장
  let ensured;
  try {
    ensured = await ensureLiveInput(session.id, title);
  } catch (e) {
    console.error("[createBroadcast] ensureLiveInput failed:", e);
    return {
      success: false,
      error: "송출 채널(LiveInput) 준비에 실패했습니다.",
    };
  }

  // 5) Broadcast(세션) 생성 + 태그/카테고리 연결 + 채팅방 생성
  try {
    const broadcast = await db.broadcast.create({
      data: {
        liveInputId: ensured.liveInputId,
        title: title.trim(),
        description: description?.toString().trim() || null,
        thumbnail: thumbnail || null,

        visibility,
        password: passwordHash,

        status: INITIAL_STATUS, // "DISCONNECTED"
        streamCategoryId,

        tags:
          tags && tags.length
            ? {
                connectOrCreate: tags.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              }
            : undefined,
      },
      select: { id: true },
    });

    // 채팅방 생성(실패해도 방송은 유지)
    try {
      await createStreamChatRoom(broadcast.id);
    } catch (chatErr) {
      console.error("[createBroadcast] chat room create failed:", chatErr);
    }

    // 생성 직후 캐시 무효화(방송국 1페이지 캐시/상세 캐시)
    revalidateTag(T.USER_STREAMS_ID(session.id));
    revalidateTag(T.BROADCAST_DETAIL(broadcast.id));

    return {
      success: true,
      liveInputId: ensured.liveInputId,
      broadcastId: broadcast.id,
      streamKey: ensured.streamKey,
      rtmpUrl: ensured.rtmpUrl,
    };
  } catch (error) {
    console.error("[createBroadcast] DB(broadcast) step failed:", error);
    return { success: false, error: "스트리밍 생성에 실패했습니다." };
  }
};
