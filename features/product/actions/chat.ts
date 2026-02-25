/**
 * File Name : features/product/actions/chat.ts
 * Description : 제품 채팅방 생성 및 유저 조회 Controller
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
 */
"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import { createChatRoom } from "@/features/chat/service/room";
import { getProductChatUsers } from "@/features/product/service/chatUsers";
import { ChatUser } from "@/features/chat/types";

/**
 * 제품에 대한 1:1 채팅방 생성 Action
 * - 로그인 여부를 확인
 * - Chat Service를 통해 채팅방을 생성하거나 기존 방을 찾음
 * - 채팅방 목록 캐시를 무효화하고 해당 채팅방으로 리다이렉트
 *
 * @param {number} productId - 제품 ID
 */
export const createChatRoomAction = async (productId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const chatRoomId = await createChatRoom(session.id, productId);

  revalidateTag(T.CHAT_ROOMS());
  return redirect(`/chats/${chatRoomId}`);
};

/**
 * 예약자 선택을 위한 채팅 상대 목록 조회 Action
 * - 판매자가 예약자를 지정할 때, 해당 제품으로 대화한 유저 목록을 불러옴
 *
 * @param {number} productId - 제품 ID
 * @returns {Promise<ChatUser[]>} 채팅한 유저 목록
 */
export async function getProductChatUsersAction(
  productId: number
): Promise<ChatUser[]> {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  return getProductChatUsers(productId, session.id);
}
