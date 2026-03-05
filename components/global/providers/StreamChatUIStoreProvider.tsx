/**
 * File Name : components/global/providers/StreamChatUIStoreProvider.tsx
 * Description : SSR 환경에서 안전한 스트림 채팅 UI Zustand 스토어 주입 Provider
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.04  임도헌   Created   Store Factory + Context 패턴으로 요청 간 상태 오염 방지
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import {
  createStreamChatUIStore,
  StreamChatUIStore,
} from "@/lib/store/streamChatUIStore";

const StreamChatUIStoreContext = createContext<ReturnType<
  typeof createStreamChatUIStore
> | null>(null);

/**
 * 스트림 채팅 UI 전역 상태 관리 Provider
 *
 * [상태 주입 및 제어 로직]
 * - SSR 환경에서 사용자 간 상태 오염(Cross-Request Pollution)을 방지하기 위한 Store Factory 패턴 적용
 * - `useRef`를 활용하여 최초 렌더링 시 단일 Zustand 스토어 인스턴스 생성 및 Context 주입
 * - 모바일 채팅창 확대/축소 및 데스크톱 채팅창 표시 여부 전역 제어
 */
export function StreamChatUIStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<ReturnType<typeof createStreamChatUIStore>>();
  if (!storeRef.current) storeRef.current = createStreamChatUIStore();

  return (
    <StreamChatUIStoreContext.Provider value={storeRef.current}>
      {children}
    </StreamChatUIStoreContext.Provider>
  );
}

export function useStreamChatUIStore<T>(
  selector: (store: StreamChatUIStore) => T
): T {
  const context = useContext(StreamChatUIStoreContext);
  if (!context) {
    throw new Error(
      "useStreamChatUIStore must be used within StreamChatUIStoreProvider"
    );
  }
  return useStore(context, selector);
}
