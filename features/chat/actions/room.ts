/**
 * File Name : features/chat/actions/room.ts
 * Description : 채팅방 관리 Controller (나가기)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.21  임도헌   Created   app/chats/[id]/actions.ts 파일을 기능별로 분리
 * 2025.12.02  임도헌   Modified  채팅방 나가기 액션(leaveChatRoomAction) 추가
 * 2026.01.02  임도헌   Modified  chat-rooms 태그 무효화 추가(채팅방 목록 캐시 정합성)
 * 2026.01.03  임도헌   Modified  CHAT_ROOMS_ID(per-user) 정밀 무효화 적용(효율성 우선)
 * 2026.01.22  임도헌   Modified  Service Layer 통합 및 Session 주입, 불필요 Action 제거
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/chats/[id]/actions/room.ts -> features/chat/actions/room.ts
 * 2026.02.22  임도헌   Modified  방을 나갈 때 남아있는 상대방의 채팅 목록 캐시도 무효화
 * 2026.03.03  임도헌   Modified  채팅방 목록 조회 액션(getChatRoomsAction) 추가
 * 2026.03.04  임도헌   Modified  주석 최신화
 * 2026.03.05  임도헌   Modified  레거시 `revalidateTag` 의존성 제거 및 `invalidateQueries`를 통한 클라이언트 캐시 무효화로 대체
 */
"use server";

import getSession from "@/lib/session";
import { leaveChatRoom, getChatRooms } from "@/features/chat/service/room";
import type { ChatRoom } from "@/features/chat/types";

/**
 * 채팅방 전체 목록 조회 Server Action
 *
 * [데이터 페칭 전략]
 * - 로그인 세션 확인 및 사용자 ID 추출
 * - 클라이언트 TanStack Query의 `queryFn` 연동을 위한 순수 DB 조회 데이터 반환
 *
 * @returns {Promise<ChatRoom[]>} 차단 필터링이 적용된 사용자 참여 채팅방 목록
 */
export async function getChatRoomsAction(): Promise<ChatRoom[]> {
  const session = await getSession();
  if (!session?.id) return [];

  // Service 레이어의 순수 DB 조회 함수 호출
  return await getChatRooms(session.id);
}

/**
 * 채팅방 퇴장 Server Action
 *
 * [데이터 가공 및 상태 제어 로직]
 * - 로그인 세션 검증 후 Service 레이어를 통해 채팅방 연결 해제 및 PENDING 약속 일괄 취소
 * - 상대방이 남아있는 경우 시스템 메시지("상대방이 나갔습니다") 저장 및 실시간 전송
 * - 클라이언트에서는 성공 시 TanStack Query 캐시 수동 무효화 처리
 *
 * @param {string} chatRoomId - 퇴장할 채팅방 ID
 */
export const leaveChatRoomAction = async (chatRoomId: string) => {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await leaveChatRoom(chatRoomId, session.id);

  return result;
};
