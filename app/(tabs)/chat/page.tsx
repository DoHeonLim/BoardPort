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
 * 2026.02.08  임도헌   Modified  unreadNotificationCount 조회 및 전달 추가
 * 2026.03.03  임도헌   Modified  TanStack Query prefetchQuery 및 HydrationBoundary 적용 (initialRooms Props 제거)
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import { getChatRooms } from "@/features/chat/service/room";
import ChatRoomListContainer from "@/features/chat/components/ChatRoomListContainer";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import { Suspense } from "react";
import Skeleton from "@/components/ui/Skeleton";

/**
 * 채팅방 목록 페이지
 *
 * [기능]
 * - 로그인 세션 확인 및 비인가 사용자 리다이렉트 처리
 * - TanStack Query 활용 채팅방 목록(`getCachedChatRooms`) 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 상태의 클라이언트 안전 전달
 */
export default async function ChatPage() {
  const session = await getSession();

  // 미들웨어에서 처리하지만 안전하게 한 번 더 체크
  if (!session?.id) {
    redirect("/login?callbackUrl=/chat");
  }

  const userId = session.id;
  const queryClient = getQueryClient();

  // 채팅방 목록과 안 읽은 전체 알림 수 병렬 패칭
  const [, unreadNotiCount] = await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.chats.list(userId),
      queryFn: () => getChatRooms(userId),
    }),
    getUnreadNotificationCount(),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ChatListSkeleton />}>
        <ChatRoomListContainer
          userId={userId}
          unreadNotificationCount={unreadNotiCount}
        />
      </Suspense>
    </HydrationBoundary>
  );
}

function ChatListSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background px-page-x py-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
      ))}
    </div>
  );
}
