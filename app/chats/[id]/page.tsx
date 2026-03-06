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
 * 2026.02.04  임도헌   Modified  채팅방 상세 진입 시 양방향 차단 가드 로직 적용
 * 2026.03.03  임도헌   Modified  TanStack Query HydrationBoundary 적용 및 initialMessages Prop 제거
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import getSession from "@/lib/session";
import Skeleton from "@/components/ui/Skeleton";
import ChatMessagesList from "@/features/chat/components/ChatMessagesList";
import ChatHeader from "@/features/chat/components/ChatHeader";
import { getUserInfoById } from "@/features/user/service/profile";
import {
  getChatRoomDetails,
  getCounterpartyInChatRoom,
  checkChatRoomAccess,
} from "@/features/chat/service/room";
import { markMessagesAsRead } from "@/features/chat/service/message";
import { getMoreMessagesAction } from "@/features/chat/actions/messages";
import { checkBlockRelation } from "@/features/user/service/block";

/**
 * 채팅방 상세 페이지
 *
 * [기능]
 * - 로그인 세션 확인 및 비인가 사용자 리다이렉트 처리
 * - 채팅방 참여 권한(접근 인가) 및 대상 유저와의 양방향 차단 관계 검증 (차단 시 403 리다이렉트 처리)
 * - 채팅방 정보 및 상대방 정보의 서버 사이드 병렬 로드 적용
 * - TanStack Query를 활용한 초기 채팅 메시지 데이터 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달 및 즉각적인 읽음 처리 수행
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
  const queryClient = getQueryClient();
  const [product, counterparty] = await Promise.all([
    getChatRoomDetails(room.productId),
    getCounterpartyInChatRoom(chatRoomId, viewer.id),
    // 초기 메시지 데이터 프리패치
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.chats.messages(chatRoomId),
      queryFn: async () => {
        const res = await getMoreMessagesAction(chatRoomId, null);
        if (!res.success) throw new Error(res.error);
        return res.data ?? [];
      },
      initialPageParam: null as number | null,
    }),
  ]);

  if (!product || !counterparty) return notFound();

  // 5. 차단 관계 확인
  if (!counterparty.hasLeft) {
    const isBlocked = await checkBlockRelation(viewer.id, counterparty.id);
    if (isBlocked) {
      redirect(
        `/403?reason=BLOCKED&username=${encodeURIComponent(
          counterparty.username
        )}&callbackUrl=${encodeURIComponent(`/chats/${chatRoomId}`)}`
      );
    }
  }

  // 6. 읽음 처리 (Service 직접 호출)
  // 진입 시점의 읽지 않은 메시지를 모두 읽음 처리
  await markMessagesAsRead(chatRoomId, viewer.id);

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
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<MessageSkeleton />}>
          <ChatMessagesList
            productChatRoomId={chatRoomId}
            user={viewer}
            isCounterpartyLeft={counterparty.hasLeft}
          />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4 overflow-hidden flex flex-col justify-end pb-20">
      <div className="flex justify-start">
        <Skeleton className="h-10 w-2/3 rounded-2xl rounded-bl-none" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-1/2 rounded-2xl rounded-br-none bg-brand/20" />
      </div>
    </div>
  );
}
