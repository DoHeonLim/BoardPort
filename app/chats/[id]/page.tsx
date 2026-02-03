/**
 * File Name : app/chats/[id]/page.tsx
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
 * 2026.01.22  임도헌   Modified  Service 직접 호출로 최적화 (Action 의존 제거)
 * 2026.01.24  임도헌   Modified  getSession 추가 및 getUserInfoById 호출 수정
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import { notFound, redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { cn } from "@/lib/utils";
import getSession from "@/lib/session";

import ChatMessagesList from "@/features/chat/components/ChatMessagesList";
import ChatHeader from "@/features/chat/components/ChatHeader";
import { getUserInfoById } from "@/features/user/service/profile";
import {
  getChatRoomDetails,
  getCounterpartyInChatRoom,
  checkChatRoomAccess,
} from "@/features/chat/service/room";
import {
  getInitialMessages,
  markMessagesAsRead,
} from "@/features/chat/service/message";

/**
 * 채팅방 상세 페이지
 *
 * [기능]
 * 1. 로그인 세션 및 사용자 정보를 확인합니다.
 * 2. 해당 채팅방에 대한 접근 권한을 검증합니다.
 * 3. 제품 정보, 상대방 정보, 초기 메시지를 병렬로 로드합니다.
 * 4. 상대방이 보낸 메시지들을 읽음 처리하고 캐시를 갱신합니다.
 * 5. `ChatHeader`와 `ChatMessagesList`를 렌더링합니다.
 *
 * @param {Object} params - URL 파라미터 (id: 채팅방 ID)
 */
export default async function ChatRoom({ params }: { params: { id: string } }) {
  const chatRoomId = params.id;

  // 1. Session 확인
  const session = await getSession();
  if (!session?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/chats/${chatRoomId}`)}`
    );
  }

  // 2. Viewer 조회 (Service 호출)
  const viewer = await getUserInfoById(session.id);
  if (!viewer) return notFound(); // 계정 삭제 등의 경우

  // 3. 권한 체크 (Service 직접 호출)
  const room = await checkChatRoomAccess(chatRoomId, viewer.id);
  if (!room) return notFound();

  // 4. 데이터 병렬 로딩 (Service 직접 호출)
  const [product, counterparty, initialMessages] = await Promise.all([
    getChatRoomDetails(room.productId),
    getCounterpartyInChatRoom(chatRoomId, viewer.id),
    getInitialMessages(chatRoomId, 20),
  ]);

  if (!product || !counterparty) return notFound();

  // 5. 읽음 처리 (Service 직접 호출)
  // 진입 시점의 읽지 않은 메시지를 모두 읽음 처리
  const readResult = await markMessagesAsRead(chatRoomId, viewer.id);
  if (
    readResult.success &&
    readResult.readIds &&
    readResult.readIds.length > 0
  ) {
    revalidateTag(T.CHAT_ROOMS_ID(viewer.id));
    revalidateTag(T.CHAT_ROOMS());
  }

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
