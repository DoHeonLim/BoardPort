/**
 * File Name : features/chat/hooks/useChatRoomSubscription.ts
 * Description : Supabase 채팅방 실시간 구독 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.16  임도헌   Created   실시간 처리 로직 훅으로 분리
 * 2025.07.16  임도헌   Modified  Supabase 채팅방 실시간 구독 로직 분리
 * 2025.07.22  임도헌   Modified  단계별 주석 추가 및 코드 흐름 설명 강화
 * 2025.11.21  임도헌   Modified  unreadCount 서버 계산 기반으로 초기화
 * 2026.01.16  임도헌   Moved     hooks -> hooks/chat
 * 2026.01.18  임도헌   Moved     hooks/chat -> features/chat/hooks
 * 2026.01.22  임도헌   Modified  Utils 경로 수정
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.03.03  임도헌   Modified  useState 기반 상태 제거 및 useSuspenseQuery / setQueryData 연동으로 구조 전면 개편
 * 2026.03.03  임도헌   Modified  getChatRoomsAction 서버 액션 호출로 변경 (Service 직접 호출 차단)
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  message_read readerId 기준으로 unreadCount 초기화 조건 보강
 * 2026.03.13  임도헌   Modified  SYSTEM 메시지 수신 시 채팅방 목록 unreadCount를 증가시키지 않도록 보정
 * 2026.04.01  임도헌   Modified  message_deleted 이벤트로 마지막 메시지와 unreadCount를 동기화
 * 2026.04.02  임도헌   Modified  채팅방 목록 구독 훅 JSDoc 반환 설명 보강
 * 2026.04.04  임도헌   Modified  사용자 채널 rooms_refresh로 새 채팅방 등장 시 목록 재조회 지원
 * 2026.04.14  임도헌   Modified  채팅 목록 성능 점검 대응으로 방별 구독을 제거하고 사용자 단위 refresh 채널만 유지
 * 2026.05.17  임도헌   Modified  사용자 단위 refresh 채널을 ChatRoomsRealtimeBridge로 이동해 목록 훅은 query 조회만 담당
 */

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getChatRoomsAction } from "@/features/chat/actions/room";

/**
 * 채팅방 목록 페이지용 실시간 구독 훅
 *
 * [기능 및 동작 원리]
 * 1. `useSuspenseQuery`를 활용하여 하이드레이션된 채팅방 목록을 선언적으로 가져옴
 * 2. Realtime 이벤트 처리는 탭 레이아웃의 `ChatRoomsRealtimeBridge`가 담당
 * 3. 목록 훅은 query data를 읽는 역할만 맡아 탭바와 같은 채널을 중복으로 열지 않음
 *
 * @param {number} userId - 현재 접속 중인 사용자 ID
 * @returns {{ rooms: ChatRoom[] }} 최신화된 채팅방 목록 query 결과
 */
export default function useChatRoomSubscription(userId: number) {
  const queryKey = queryKeys.chats.list(userId);

  // 1. 서버 캐시 연동 (Suspense 지원)
  const { data: rooms } = useSuspenseQuery({
    queryKey,
    queryFn: () => getChatRoomsAction(),
    staleTime: 60 * 1000,
  });

  return { rooms };
}
