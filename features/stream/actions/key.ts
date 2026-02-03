/**
 * File Name : features/stream/actions/key.ts
 * Description : LiveInput 키 관리 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.12  임도헌   Created
 * 2024.11.12  임도헌   Modified  현재 스트리밍 얻어오는 코드 추가
 * 2024.11.18  임도헌   Modified  스트리밍이 끝났다면 삭제하는 코드 추가
 * 2024.11.19  임도헌   Modified  캐싱 기능 추가
 * 2024.11.21  임도헌   Modified  console.log 삭제
 * 2024.11.22  임도헌   Modified  스트리밍 채팅방 관련 코드 추가
 * 2025.05.01  임도헌   Modified  .tsx -> .ts로 수정
 * 2025.07.30  임도헌   Modified  비즈니스 로직 lib로 분리하고 revalidateTag만 유지
 * 2025.08.19  임도헌   Modified  rotateStreamKeyAction 추가
 * 2025.09.06  임도헌   Modified  sendStreamMessageAction 입력 검증/에러 코드 통일, 메시지 캐시 리빌리데이트 제거, import 경로 정리
 * 2025.11.22  임도헌   Modified  broadcast-list 캐시 태그 제거 및 user-streams-id 태그 갱신 추가
 * 2026.01.23  임도헌   Modified  Service 연동, Client용 Action 추가 (Unlock, GetKey)
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/streams/[id]/actions.ts (getStreamKeyAction, rotateLiveInputKeyAction) -> features/stream/actions/key.ts
 */
"use server";

import getSession from "@/lib/session";
import {
  rotateLiveInputKey,
  getStreamKey,
} from "@/features/stream/service/liveInput";
import type {
  GetStreamKeyResult,
  RotateLiveInputKeyResult,
} from "@/features/stream/types";

/**
 * LiveInput 키 재발급 Action
 */
export async function rotateLiveInputKeyAction(
  liveInputId: number
): Promise<RotateLiveInputKeyResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  return await rotateLiveInputKey(liveInputId, session.id);
}

/**
 * 방송 송출 키 조회 Action
 */
export async function getStreamKeyAction(
  broadcastId: number
): Promise<GetStreamKeyResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

  return await getStreamKey(broadcastId, session.id);
}
