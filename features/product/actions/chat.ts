/**
 * File Name : features/product/actions/chat.ts
 * Description : 제품 채팅방 생성 및 채팅 상대 조회 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.12  임도헌   Created   채팅방 생성 함수 구현
 * 2025.06.08  임도헌   Modified  actions 파일 역할별 분리 완료
 * 2025.07.13  임도헌   Modified  비즈니스 로직 분리 및 리다이렉트 유지
 * 2026.01.22  임도헌   Modified  Service 경로 수정 (createChatRoom)
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/products/view/[id]/actions/chat.ts -> features/product/actions/chat.ts
 * 2026.03.05  임도헌   Modified  채팅방 생성 후 `revalidateTag` 기반 서버 상태 갱신 방식 제거 및 클라이언트 캐시 제어 적용
 * 2026.03.12  임도헌   Modified  채팅 진입 시 returnTo 복귀 경로를 함께 전달할 수 있도록 보강
 * 2026.04.02  임도헌   Modified  파일 설명과 액션 주석을 현재 서버 액션 톤으로 정리
 * 2026.04.04  임도헌   Modified  채팅방 생성/복귀 경로 정규화 단계의 인라인 주석 보강
 */
"use server";

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import { createChatRoom } from "@/features/chat/service/room";
import { getProductChatUsers } from "@/features/product/service/chatUsers";
import { ChatUser } from "@/features/chat/types";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 제품 1:1 채팅방 생성 서버 액션
 *
 * [기능]
 * - 로그인 세션을 확인
 * - 채팅 service를 통해 기존 방을 찾거나 새 채팅방을 생성
 * - 필요 시 returnTo 복귀 경로를 포함해 채팅방으로 리다이렉트
 *
 * @param {number} productId - 제품 ID
 * @param {string} [returnTo] - 채팅방 뒤로가기 fallback 경로
 */
export const createChatRoomAction = async (
  productId: number,
  returnTo?: string
) => {
  // 로그인 세션 확인
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  // 기존 방 재사용 또는 신규 방 생성
  const chatRoomId = await createChatRoom(session.id, productId);

  // 채팅 뒤로가기 fallback 경로 정규화
  const nextReturnTo = sanitizeCallbackUrl(returnTo ?? "/chat");
  return redirect(
    `/chats/${chatRoomId}?returnTo=${encodeURIComponent(nextReturnTo)}`
  );
};

/**
 * 예약 후보용 채팅 상대 목록 조회 서버 액션
 *
 * [기능]
 * - 로그인 세션을 확인
 * - 판매자가 예약자를 지정할 때 필요한 대화 상대 목록을 조회
 *
 * @param {number} productId - 제품 ID
 * @returns {Promise<ChatUser[]>} 채팅 상대 목록
 */
export async function getProductChatUsersAction(
  productId: number
): Promise<ChatUser[]> {
  // 로그인 세션 확인
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  // 판매자 예약 후보용 채팅 상대 목록 조회
  return getProductChatUsers(productId, session.id);
}
