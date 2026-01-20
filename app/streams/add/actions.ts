/**
 * File Name : app/streams/add/actions
 * Description : 라이브 스트리밍 시작 server 코드 (Server Action 래퍼)
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
 */

"use server";

import { revalidatePath } from "next/cache";
import { createBroadcast } from "@/features/stream/lib/createBroadcast";
import type { CreateBroadcastResult } from "@/types/stream";

/**
 * createBroadcastAction
 * - FormData를 받아 방송(Broadcast) 생성
 * - 성공 시 목록/페이지 캐시 무효화
 */
export const createBroadcastAction = async (
  formData: FormData
): Promise<CreateBroadcastResult> => {
  try {
    const result = await createBroadcast(formData);

    if (result.success) {
      revalidatePath("/streams", "page");
    }

    return result;
  } catch (err) {
    console.error("[createBroadcastAction] failed:", err);
    return { success: false, error: "스트리밍 생성에 실패했습니다." };
  }
};
