/**
 * File Name : features/stream/actions/create.ts
 * Description : 스트리밍 생성 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.11.12  임도헌   Created
 * 2024.11.12  임도헌   Modified   라이브 스트리밍 시작 server 코드 추가
 * 2024.11.19  임도헌   Modified   캐싱 기능 추가
 * 2024.11.21  임도헌   Modified   라이브 스트리밍 채팅방 생성 코드 추가
 * 2025.05.22  임도헌   Modified   스트리밍 상태 관리 시스템 반영
 * 2025.07.30  임도헌   Modified   비즈니스 로직 분리
 * 2025.09.09  임도헌   Modified   try/catch 보강, 실패시 일관된 에러 반환, 태그 리밸리데이션 주석 정리
 * 2025.09.15  임도헌   Modified   createBroadcastAction으로 리네이밍, 캐시 태그 정리(broadcast-list)
 * 2025.11.22  임도헌   Modified   broadcast-list 캐시 태그 제거
 * 2026.01.23  임도헌   Modified   Service(createBroadcast) 연동 및 Session 검증 분리
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/streams/add/actions.ts -> features/stream/actions/create.ts
 * 2026.03.07  임도헌   Modified  태그 payload 파싱 오류를 ActionState 실패로 정규화
 * 2026.03.08  임도헌   Modified  Zod 검증 실패를 fieldErrors 형태로 반환해 폼 하단 에러 매핑과 연결
 * 2026.03.12  임도헌   Modified  GIF 조건부 최적화를 위한 thumbnailAnimated 메타 파싱 및 전달 추가
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 id 파싱 및 관련 경로 갱신 추가
 */

"use server";

import { revalidatePath } from "next/cache";
import getSession from "@/lib/session";
import { createBroadcast } from "@/features/stream/service/create";
import { streamFormSchema } from "@/features/stream/schemas";
import { parseBoardGameIdsFormValue } from "@/features/boardgame/utils/form";
import type { CreateBroadcastResult } from "@/features/stream/types";

/**
 * 스트리밍 생성 Action
 *
 * - 로그인 세션 확인
 * - 태그 JSON 파싱 및 폼 스키마 검증
 * - 검증 실패 시 fieldErrors 반환
 * - 방송 생성 service 호출
 * - 성공 시 `/streams` 경로 갱신
 *
 * @param {FormData} formData - 방송 생성 폼 데이터
 * @returns {Promise<CreateBroadcastResult>} 생성 결과 (RTMP URL, Key 등 포함)
 */
export const createBroadcastAction = async (
  formData: FormData
): Promise<CreateBroadcastResult> => {
  try {
    const session = await getSession();
    if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

    // 태그 메타 파싱
    const rawTags = (formData.get("tags") as string) || "[]";
    let tagsSafe: string[] = [];
    try {
      const parsedTags = JSON.parse(rawTags);
      if (!Array.isArray(parsedTags)) {
        return {
          success: false,
          error: "태그 형식이 올바르지 않습니다.",
          fieldErrors: { tags: ["태그 형식이 올바르지 않습니다."] },
        };
      }
      tagsSafe = parsedTags.map(String);
    } catch {
      return {
        success: false,
        error: "태그 형식이 올바르지 않습니다.",
        fieldErrors: { tags: ["태그 형식이 올바르지 않습니다."] },
      };
    }

    // 연결 보드게임 ID 파싱
    const boardGameIds = parseBoardGameIdsFormValue(
      formData.get("boardGameIds")
    );
    if (!boardGameIds) {
      return {
        success: false,
        error: "보드게임 연결 정보 형식이 올바르지 않습니다.",
        fieldErrors: {
          boardGameIds: ["보드게임 연결 정보 형식이 올바르지 않습니다."],
        },
      };
    }

    // 생성 payload 구성
    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      thumbnail: formData.get("thumbnail"),
      thumbnailAnimated: formData.get("thumbnailAnimated") === "true",
      visibility: formData.get("visibility"),
      password: formData.get("password"),
      streamCategoryId: Number(formData.get("streamCategoryId")),
      tags: tagsSafe,
      boardGameIds,
    };

    // 폼 스키마 검증
    const parsed = streamFormSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "입력값이 올바르지 않습니다.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // 생성 service 위임
    const result = await createBroadcast(session.id, parsed.data);

    // 목록 경로 갱신
    if (result.success) {
      revalidatePath("/streams", "page");
      boardGameIds.forEach((boardGameId) => {
        revalidatePath(`/boardgames/${boardGameId}`);
      });
    }

    return result;
  } catch (err) {
    console.error("[createBroadcastAction] failed:", err);
    return { success: false, error: "스트리밍 생성에 실패했습니다." };
  }
};
