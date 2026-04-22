/**
 * File Name : app/(app)/chats/[id]/page.tsx
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
 * 2026.03.12  임도헌   Modified  채팅방 내부 검색을 위해 헤더/메시지 상태를 공유하는 ChatRoomClient 래퍼 도입
 * 2026.03.12  임도헌   Modified  제품 상세에서 진입한 채팅방이 returnTo 경로로 복귀할 수 있도록 보강
 * 2026.03.13  임도헌   Modified  returnTo를 로그인/차단 가드 callbackUrl에 반영
 * 2026.03.14  임도헌   Modified  데스크톱에서 채팅 헤더와 메시지 영역이 과도하게 넓지 않도록 최대 폭 제약 추가
 * 2026.03.27  임도헌   Modified  채팅 배경 일러스트 대비를 한 단계 눌러 메시지/입력 UI가 먼저 읽히도록 조정
 * 2026.04.12  임도헌   Moved     파일 경로를 app/chats/[id]/page.tsx 에서 app/(app)/chats/[id]/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  채팅 상세 최적화 대응으로 배경 장식을 제거하고 앱 셸을 단순화
*/

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import getSession from "@/lib/session";
import Skeleton from "@/components/ui/Skeleton";
import ChatRoomClient from "@/features/chat/components/ChatRoomClient";
import { getUserInfoById } from "@/features/user/service/profile";
import {
  getChatRoomDetails,
  getCounterpartyInChatRoom,
  checkChatRoomAccess,
} from "@/features/chat/service/room";
import { markMessagesAsRead } from "@/features/chat/service/message";
import { getMoreMessagesAction } from "@/features/chat/actions/messages";
import { checkBlockRelation } from "@/features/user/service/block";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 제품 채팅방 상세 페이지
 *
 * - 로그인/복귀 경로 확인
 * - 채팅방 접근 권한 및 차단 관계 검증
 * - 채팅방 요약/상대방/초기 메시지 병렬 로드
 * - HydrationBoundary 기반 초기 메시지 캐시 전달
 * - 진입 시점 읽음 처리
 *
 * @param {{ params: { id: string }; searchParams?: { returnTo?: string } }} props - 라우트 파라미터와 복귀 경로 쿼리
 * @returns {Promise<JSX.Element>} 제품 채팅방 상세 화면
 */
export default async function ChatRoom({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { returnTo?: string };
}) {
  const chatRoomId = params.id;
  const returnTo = sanitizeCallbackUrl(searchParams?.returnTo ?? "/chat");
  const detailHref = `/chats/${chatRoomId}?returnTo=${encodeURIComponent(
    returnTo
  )}`;

  // 로그인 세션 확인
  const session = await getSession();
  if (!session?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(detailHref)}`);
  }

  // 현재 사용자 정보 조회
  const viewer = await getUserInfoById(session.id);
  if (!viewer) return notFound();

  // 채팅방 접근 권한 확인
  const room = await checkChatRoomAccess(chatRoomId, viewer.id);
  if (!room) return notFound();

  // 채팅방 메타와 초기 메시지 병렬 로드
  const queryClient = getQueryClient();
  const [product, counterparty, initialMessagesResult] = await Promise.all([
    getChatRoomDetails(room.productId),
    getCounterpartyInChatRoom(chatRoomId, viewer.id),
    getMoreMessagesAction(chatRoomId, null),
  ]);

  if (!product || !counterparty) return notFound();
  if (!initialMessagesResult.success) {
    throw new Error(initialMessagesResult.error);
  }

  const initialMessages = initialMessagesResult.data ?? [];

  queryClient.setQueryData(queryKeys.chats.messages(chatRoomId), {
    pages: [initialMessages],
    pageParams: [null],
  });

  // 남아 있는 상대방과의 차단 관계 재확인
  if (!counterparty.hasLeft) {
    const isBlocked = await checkBlockRelation(viewer.id, counterparty.id);
    if (isBlocked) {
      redirect(
        `/403?reason=BLOCKED&username=${encodeURIComponent(
          counterparty.username
        )}&callbackUrl=${encodeURIComponent(detailHref)}`
      );
    }
  }

  // 진입 시점 unread 정리
  await markMessagesAsRead(chatRoomId, viewer.id);

  return (
    <main
      className={cn(
        "relative isolate flex h-[100dvh] flex-col overflow-hidden",
        "bg-background"
      )}
    >
      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense fallback={<MessageSkeleton />}>
            <ChatRoomClient
              chatRoomId={chatRoomId}
              viewerId={viewer.id}
              counterparty={counterparty}
              product={product}
              viewer={viewer}
              isCounterpartyLeft={counterparty.hasLeft}
              returnTo={returnTo}
            />
          </Suspense>
        </HydrationBoundary>
      </div>
    </main>
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

