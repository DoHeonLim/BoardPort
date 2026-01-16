/**
 * File Name : app/chats/[id]/page
 * Description : 제품 채팅 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.08  임도헌   Created
 * 2024.11.08  임도헌   Modified  제품 채팅 페이지 추가
 * 2024.11.15  임도헌   Modified  prisma 코드 actions으로 옮김
 * 2024.11.21  임도헌   Modified  Chatroom을 productChatRoom으로 변경
 * 2024.12.12  임도헌   Modified  뒤로가기 버튼 추가
 * 2024.12.22  임도헌   Modified  채팅방에 어떤 제품인지 추가
 * 2025.05.01  임도헌   Modified  뒤로가기 버튼 삭제
 * 2025.07.13  임도헌   Modified  함수명 변경 및 비즈니스 로직 분리
 * 2025.07.17  임도헌   Modified  메시지 무한 스크롤 구현
 * 2025.07.24  임도헌   Modified  캐싱 기능 추가
 * 2025.11.21  임도헌   Modified  메시지 초기 로딩 캐싱 제거
 * 2025.12.02  임도헌   Modified  counterparty 조회 헬퍼(getCounterpartyInChatRoom) 도입
 * 2025.12.02  임도헌   Modified  반응형 UI 조정
 * 2026.01.03  임도헌   Modified  current/byId 분리로 중복 getSession 방지
 */

import ChatMessagesList from "@/components/chat/ChatMessagesList";
import ChatHeader from "@/components/chat/ChatHeader";
import { notFound } from "next/navigation";
import { getCurrentUserInfo } from "@/lib/user/getUserInfo";
import { getChatRoomDetails } from "@/lib/chat/room/getChatRoomDetails";
import { getCounterpartyInChatRoom } from "@/lib/chat/room/getCounterpartyInChatRoom";
import {
  getInitialMessagesAction,
  readMessageUpdateAction,
} from "./actions/messages";
import { checkChatRoomAccessAction } from "./actions/room";
import { cn } from "@/lib/utils";

export default async function ChatRoom({ params }: { params: { id: string } }) {
  const chatRoomId = params.id;

  // 1) 현재 사용자 정보
  const viewer = await getCurrentUserInfo();
  if (!viewer) return notFound();

  // 2) 이 방에 접근 가능한지 확인 (상품/권한 체크 등)
  const room = await checkChatRoomAccessAction(chatRoomId, viewer.id);
  if (!room) return notFound();

  // 3) 제품 + 상대 유저 + 초기 메시지 병렬 로딩
  const [product, counterparty, initialMessages] = await Promise.all([
    getChatRoomDetails(room.productId),
    getCounterpartyInChatRoom(chatRoomId, viewer.id),
    getInitialMessagesAction(chatRoomId, 20),
  ]);

  if (!product || !counterparty) return notFound();

  // 4) 채팅방 입장 시 읽음 처리
  await readMessageUpdateAction(chatRoomId, viewer.id);

  return (
    <div
      className={cn(
        "flex flex-col h-[100dvh] overflow-hidden",
        "bg-[url('/images/light-chat-bg.png')]",
        "dark:bg-[url('/images/dark-chat-bg.png')]",
        "bg-cover bg-center"
      )}
    >
      <ChatHeader
        chatRoomId={chatRoomId}
        viewerId={viewer.id}
        counterparty={counterparty}
        product={product}
      />
      <ChatMessagesList
        productChatRoomId={chatRoomId}
        user={viewer}
        initialMessages={initialMessages}
      />
    </div>
  );
}
