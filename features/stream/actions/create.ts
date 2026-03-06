/**
 * File Name : features/stream/actions/create.ts
 * Description : 스트리밍 생성 Controller
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
 */

"use server";

import { revalidatePath } from "next/cache";
import getSession from "@/lib/session";
import { createBroadcast } from "@/features/stream/service/create";
import { streamFormSchema } from "@/features/stream/schemas";
import type { CreateBroadcastResult } from "@/features/stream/types";

/**
 * 스트리밍 생성 Action
 *
 * 1. 로그인 세션을 확인
 * 2. 폼 데이터를 파싱하고 Zod 스키마로 검증 (태그 JSON 파싱 포함)
 * 3. Service 계층을 호출하여 방송을 생성 (LiveInput 보장 포함)
 * 4. 성공 시 `/streams` 경로 캐시를 무효화
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

    // 1. 태그 파싱
    const rawTags = (formData.get("tags") as string) || "[]";
    let tagsSafe: string[] = [];
    try {
      const parsedTags = JSON.parse(rawTags);
      if (!Array.isArray(parsedTags)) {
        return { success: false, error: "태그 형식이 올바르지 않습니다." };
      }
      tagsSafe = parsedTags.map(String);
    } catch {
      return { success: false, error: "태그 형식이 올바르지 않습니다." };
    }

    // 2. 데이터 구성
    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      thumbnail: formData.get("thumbnail"),
      visibility: formData.get("visibility"),
      password: formData.get("password"),
      streamCategoryId: Number(formData.get("streamCategoryId")),
      tags: tagsSafe,
    };

    // 3. 검증
    const parsed = streamFormSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: "입력값이 올바르지 않습니다." };
    }

    // 4. Service 호출
    const result = await createBroadcast(session.id, parsed.data);

    // 5. 캐시 무효화
    if (result.success) {
      revalidatePath("/streams", "page");
    }

    return result;
  } catch (err) {
    console.error("[createBroadcastAction] failed:", err);
    return { success: false, error: "스트리밍 생성에 실패했습니다." };
  }
};
