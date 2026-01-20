/**
File Name : app/products/view/[id]/actions/chat
Description : 제품 채팅방 생성 서버 액션
Author : 임도헌

History
Date        Author   Status    Description
2024.12.12  임도헌   Created   채팅방 생성 함수 구현
2025.06.08  임도헌   Modified  actions 파일 역할별 분리 완료
2025.07.13  임도헌   Modified  비즈니스 로직 분리 및 리다이렉트 유지
*/
"use server";

import { createChatRoom } from "@/features/chat/lib/room/createChatRoom";
import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { redirect } from "next/navigation";

/**
 * 제품에 대한 채팅방 생성 함수
 * productId - 제품 ID
 * @returns 생성된 채팅방으로 리다이렉트
 */
export const createChatRoomAction = async (productId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const chatRoomId = await createChatRoom(session.id, productId);

  revalidateTag(T.CHAT_ROOMS());
  return redirect(`/chats/${chatRoomId}`);
};
