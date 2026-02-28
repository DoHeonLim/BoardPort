/**
 * File Name : components/global/providers/NotificationStoreProvider.tsx
 * Description : SSR 환경에서 안전한 Zustand 스토어 주입을 위한 Context Provider
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.28  임도헌   Created   Zustand Store Factory + Context API 패턴 적용
 */
"use client";

import { createContext, useRef, useContext } from "react";
import { useStore } from "zustand";
import {
  createNotificationStore,
  NotificationStore,
} from "@/lib/store/notificationStore";

export const NotificationStoreContext = createContext<ReturnType<
  typeof createNotificationStore
> | null>(null);

export interface NotificationStoreProviderProps {
  children: React.ReactNode;
}

/**
 * NotificationStore Provider 컴포넌트
 *
 * [동작 원리]
 * 1. 컴포넌트 최초 마운트 시 `useRef`를 활용해 단 한 번만 스토어 인스턴스를 생성
 * 2. 생성된 고유한 스토어 인스턴스를 Context API를 통해 하위 컴포넌트 트리에 공급
 * 3. 이를 통해 클라이언트 사이드 네비게이션 시에는 상태가 유지되고, 서버 렌더링 시에는 요청별로 상태가 격리됨
 *
 * @param {NotificationStoreProviderProps} props
 * @returns Provider로 감싸진 ReactNode
 */
export const NotificationStoreProvider = ({
  children,
}: NotificationStoreProviderProps) => {
  const storeRef = useRef<ReturnType<typeof createNotificationStore>>();

  // 최초 렌더링 시에만 스토어 인스턴스 생성
  if (!storeRef.current) {
    storeRef.current = createNotificationStore();
  }

  return (
    <NotificationStoreContext.Provider value={storeRef.current}>
      {children}
    </NotificationStoreContext.Provider>
  );
};

/**
 * Zustand 스토어의 상태를 안전하게 추출하기 위한 커스텀 훅
 *
 * @param selector - 스토어에서 필요한 상태/액션만 추출하는 함수
 * @throws Provider로 감싸져 있지 않을 경우 에러 발생
 * @returns 선택된 상태 값 또는 액션 함수
 */
export const useNotificationStore = <T,>(
  selector: (store: NotificationStore) => T
): T => {
  const notificationStoreContext = useContext(NotificationStoreContext);

  if (!notificationStoreContext) {
    throw new Error(
      `useNotificationStore must be used within NotificationStoreProvider`
    );
  }

  return useStore(notificationStoreContext, selector);
};
