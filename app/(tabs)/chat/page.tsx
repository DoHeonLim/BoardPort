/**
 * File Name : app/(tabs)/chat/page.tsx
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
 * 2026.01.28  임도헌   Modified  주석 보강
 */
import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import { getCachedChatRooms } from "@/features/chat/service/room";
import ChatRoomListContainer from "@/features/chat/components/ChatRoomListContainer";

/**
 * 채팅방 목록 페이지
 *
 * [기능]
 * 1. 로그인 세션을 확인합니다. (비로그인 시 로그인 페이지로 리다이렉트)
 * 2. `getCachedChatRooms` Service를 호출하여 사용자의 채팅방 목록을 조회합니다.
 *    (안 읽은 메시지 수 포함, 캐싱 적용)
 * 3. `ChatRoomListContainer`를 렌더링하여 목록을 표시하고 실시간 업데이트를 처리합니다.
 */
export default async function Chat() {
  const session = await getSession();

  // 미들웨어에서 처리하지만 안전하게 한 번 더 체크
  if (!session?.id) {
    redirect("/login?callbackUrl=/chat");
  }

  const userId = session.id!;

  // Service 직접 호출 (Cached)
  const chatRooms = await getCachedChatRooms(userId);

  return <ChatRoomListContainer initialRooms={chatRooms} userId={userId} />;
}
