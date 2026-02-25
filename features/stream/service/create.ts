/**
 * File Name : features/stream/service/create.ts
 * Description : 방송(Broadcast) 생성 비즈니스 로직
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
 * 2026.01.23  임도헌   Modified  Session 의존성 제거 및 LiveInput 보장 로직 위임
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.02.07  임도헌   Modified  정지 유저 가드(validateUserStatus) 적용
 */

import "server-only";
import { hash } from "bcrypt";
import db from "@/lib/db";
import { ensureLiveInput } from "@/features/stream/service/liveInput";
import { createStreamChatRoom } from "@/features/stream/service/chat";
import { validateUserStatus } from "@/features/user/service/admin";
import { STREAM_VISIBILITY } from "@/features/stream/constants";
import { StreamFormValues } from "@/features/stream/schemas";
import type { CreateBroadcastResult } from "@/features/stream/types";

/**
 * 방송 생성 함수
 *
 * 1. 작성자의 이용 정지 여부(Ban)를 확인
 * 2. PRIVATE 모드일 경우 비밀번호를 해싱
 * 3. 유저의 LiveInput(채널)을 보장 (없으면 Cloudflare API 호출하여 생성)
 * 4. Broadcast DB 레코드를 생성
 * 5. 채팅방을 생성 (실패해도 방송은 유지)
 *
 * @returns {Promise<CreateBroadcastResult>} OBS 연결 정보(RTMP/Key) 및 방송 ID
 */
export const createBroadcast = async (
  userId: number,
  data: StreamFormValues
): Promise<CreateBroadcastResult> => {
  // 정지 유저 체크
  const status = await validateUserStatus(userId);
  if (!status.success) {
    return { success: false, error: status.error! };
  }

  const {
    title,
    description,
    thumbnail,
    visibility,
    password,
    streamCategoryId,
    tags,
  } = data;

  // 비밀번호 해싱 (Private일 경우 필수)
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

  // 송출 채널(LiveInput) 준비
  let ensured;
  try {
    ensured = await ensureLiveInput(userId, title);
  } catch (e) {
    console.error("[createBroadcast] ensureLiveInput failed:", e);
    return {
      success: false,
      error: "송출 채널(LiveInput) 준비에 실패했습니다.",
    };
  }

  // Broadcast 생성
  try {
    const broadcast = await db.broadcast.create({
      data: {
        liveInputId: ensured.liveInputId,
        title: title.trim(),
        description: description?.trim() || null,
        thumbnail: thumbnail || null,
        visibility,
        password: passwordHash,
        status: "DISCONNECTED",
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

    // 채팅방 생성 (Fire & Forget, 실패해도 방송 진행 가능)
    try {
      await createStreamChatRoom(broadcast.id);
    } catch (chatErr) {
      console.error("[createBroadcast] chat room create failed:", chatErr);
    }

    return {
      success: true,
      liveInputId: ensured.liveInputId,
      broadcastId: broadcast.id,
      streamKey: ensured.streamKey,
      rtmpUrl: ensured.rtmpUrl,
    };
  } catch (error) {
    console.error("[createBroadcast] DB failed:", error);
    return { success: false, error: "스트리밍 생성에 실패했습니다." };
  }
};
