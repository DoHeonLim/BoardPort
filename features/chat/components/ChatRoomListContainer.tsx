/**
 * File Name : features/chat/components/ChatRoomListContainer.tsx
 * Description : 채팅방 목록 컨테이너 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.22  임도헌   Created
 * 2024.12.22  임도헌   Modified  채팅방 목록 컨테이너 컴포넌트 추가
 * 2024.12.22  임도헌   Modified  채팅방 목록 실시간 갱신
 * 2024.12.23  임도헌   Modified  채팅방 목록 실시간 갱신 오류 수정
 * 2024.12.25  임도헌   Modified  채팅방 목록 스타일 변경
 * 2025.07.16  임도헌   Modified  실시간 처리 로직 훅으로 분리
 * 2025.07.24  임도헌   Modified  리스트형 UI 리팩토링 및 스타일 개선
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 Empty State 디자인 개선
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.08  임도헌   Modified  Sticky Header 적용 및 NotificationBell 추가
 * 2026.02.23  임도헌   Modified  빈 상태 화면에 "항구로 이동하여 물품 둘러보기" 버튼을 추가
 * 2026.03.03  임도헌   Modified  initialRooms Prop Drilling 제거 및 캐시 기반 렌더링 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.08  임도헌   Modified  빈 상태의 기본 진입 애니메이션을 제거해 화면 전환 체감을 정적으로 정리
 * 2026.03.12  임도헌   Modified  채팅 목록 헤더를 flat 톤으로 통일해 다른 탭 헤더와 시각적 일관성 확보
 * 2026.03.12  임도헌   Modified  상대방/상품명/마지막 메시지 기준의 채팅방 검색 입력을 추가
 * 2026.03.12  임도헌   Modified  검색어 기준 클라이언트 필터링과 빈 검색 결과 상태 추가
 * 2026.04.10  임도헌   Modified  채팅 타이포 정책에 맞춰 검색 초기화 버튼 weight를 500 기준으로 정리
 * 2026.04.17  임도헌   Modified  채팅 목록 상단 검색창 스타일을 정리
 */

"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import useChatRoomSubscription from "@/features/chat/hooks/useChatRoomSubscription";
import ChatRoomCard from "@/features/chat/components/ChatRoomCard";
import NotificationBell from "@/components/global/NotificationBell";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ChatRoomListContainerProps {
  userId: number;
  unreadNotificationCount: number;
}

/**
 * 채팅방 목록 렌더링 컨테이너 컴포넌트
 *
 * [상태 주입 및 상호작용 로직]
 * - `useChatRoomSubscription` 훅을 통한 하이드레이션된 채팅방 캐시 데이터 선언적 렌더링
 * - 실시간 웹소켓 이벤트를 통한 최신 메시지 및 읽음 상태(unreadCount) 즉각 동기화 적용
 * - 상대방/상품명/마지막 메시지 기준 클라이언트 검색 필터링 적용
 * - 진행 중인 대화 유무에 따른 리스트 항목 또는 빈 상태(Empty State) 조건부 렌더링
 */
export default function ChatRoomListContainer({
  userId,
  unreadNotificationCount,
}: ChatRoomListContainerProps) {
  // Suspense에 의해 데이터가 보장
  const { rooms } = useChatRoomSubscription(userId);
  const [query, setQuery] = useState("");
  // 긴 목록 검색에서도 입력 반응 즉시 유지, 필터링 비용만 한 박자 늦춘 처리
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredRooms = deferredQuery
    ? rooms.filter((room) => {
        const username = room.users[0]?.username?.toLowerCase() ?? "";
        const productTitle = room.product.title.toLowerCase();
        const lastMessage = room.lastMessage?.payload?.toLowerCase() ?? "";

        return (
          username.includes(deferredQuery) ||
          productTitle.includes(deferredQuery) ||
          lastMessage.includes(deferredQuery)
        );
      })
    : rooms;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 h-16 border-b border-border-subtle bg-background shadow-sm transition-colors">
        <div className="flex items-center justify-between px-page-x h-full max-w-mobile mx-auto">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold text-primary">신호</h1>
            <span className="rounded-full border border-border-subtle bg-surface-dim px-2 py-0.5 text-xs font-bold text-primary">
              {rooms.length}
            </span>
          </div>

          <NotificationBell
            userId={userId}
            initialCount={unreadNotificationCount}
          />
        </div>
      </header>

      {/* 목록 영역 */}
      <div className="px-page-x py-6 w-full max-w-mobile mx-auto flex-1">
        {rooms.length > 0 && (
          <div className="mb-4">
            <label className="relative block">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="상대방, 상품, 마지막 대화 검색"
                className="searchbar-compact-input h-11 rounded-2xl pl-11 pr-11"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="focus-ring-soft absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-primary"
                  aria-label="검색어 지우기"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </label>
          </div>
        )}

        {rooms.length > 0 ? (
          filteredRooms.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredRooms.map((room) => (
                <ChatRoomCard
                  key={room.id}
                  room={room}
                  // 기존 별도 객체로 관리되던 unreadCount가 캐시된 room 객체에 내장
                  unreadCount={room.unreadCount ?? 0}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border-subtle bg-surface px-6 py-16 text-center shadow-sm">
              <div className="mb-4 rounded-full bg-surface-dim p-4">
                <MagnifyingGlassIcon className="size-8 text-muted/60" />
              </div>
              <p className="text-lg font-medium text-primary">
                검색 결과가 없습니다
              </p>
              <p className="mt-1 text-sm text-muted">
                상대방 이름, 상품명 또는 마지막 대화 내용을 다시 확인해보세요.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="focus-ring-soft mt-6 inline-flex h-10 items-center rounded-xl border border-border-subtle bg-background px-4 text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
              >
                검색 초기화
              </button>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-surface-dim mb-4">
              <ChatBubbleOvalLeftEllipsisIcon className="size-8 text-muted/50" />
            </div>
            <p className="text-lg font-medium text-primary">
              진행 중인 대화가 없습니다
            </p>
            <p className="text-sm text-muted mt-1 mb-6">
              관심 있는 물품에 대해 대화를 시작해보세요!
            </p>
            <Link
              href="/products"
              className="btn-primary h-10 px-6 text-sm inline-flex items-center shadow-md"
            >
              항구로 이동하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
