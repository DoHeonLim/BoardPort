/**
 * File Name : app/(tabs)/chat/page
 * Description : 채팅 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  채팅 페이지 추가
 * 2024.11.15  임도헌   Modified  채팅방 캐싱 추가
 * 2024.12.05  임도헌   Modified  스타일 변경
 * 2025.07.24  임도헌   Modified  캐싱 기능 추가
 * 2025.11.21  임도헌   Modified  nextCache 제거, dynamic 페이지로 고정
 * 2026.01.03  임도헌   Modified  force-dynamic 제거 + getCachedChatRooms로 통일(효율성 우선)
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import { getCachedChatRooms } from "@/features/chat/lib/room/getChatRooms";
import ChatRoomListContainer from "@/features/chat/components/ChatRoomListContainer";

export default async function Chat() {
  const session = await getSession();

  // 미들웨어에서 처리하지만 안전하게 한 번 더 체크
  if (!session?.id) {
    redirect("/login?callbackUrl=/chat");
  }

  const userId = session.id!;
  const chatRooms = await getCachedChatRooms(userId);

  return <ChatRoomListContainer initialRooms={chatRooms} userId={userId} />;
}
