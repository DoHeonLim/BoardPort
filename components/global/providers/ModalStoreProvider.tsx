/**
 * File Name : components/global/providers/ModalStoreProvider.tsx
 * Description : SSR 환경에서 안전한 모달 Zustand 스토어 주입을 위한 Provider
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.01  임도헌   Created
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { createContext, useRef, useContext } from "react";
import { useStore } from "zustand";
import { createModalStore, ModalStore } from "@/lib/store/modalStore";

export const ModalStoreContext = createContext<ReturnType<
  typeof createModalStore
> | null>(null);

/**
 * 전역 모달 상태 관리 Provider
 *
 * [상태 주입 및 제어 로직]
 * - Next.js SSR 환경에서 다중 사용자 요청 간 상태 오염(Cross-Request State Pollution) 방지
 * - `useRef`를 활용하여 컴포넌트 최초 마운트 시 단일 Zustand 스토어 인스턴스 생성 및 Context 공급
 * - 불필요한 리렌더링 방지를 위한 Selector 훅(`useModalStore`) 제공
 */
export const ModalStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const storeRef = useRef<ReturnType<typeof createModalStore>>();

  // 최초 렌더링 시에만 스토어 인스턴스 생성
  if (!storeRef.current) {
    storeRef.current = createModalStore();
  }

  return (
    <ModalStoreContext.Provider value={storeRef.current}>
      {children}
    </ModalStoreContext.Provider>
  );
};

/**
 * 컴포넌트에서 모달 스토어를 안전하게 사용하기 위한 커스텀 훅
 */
export const useModalStore = <T,>(selector: (store: ModalStore) => T): T => {
  const context = useContext(ModalStoreContext);
  if (!context)
    throw new Error("useModalStore must be used within ModalStoreProvider");
  return useStore(context, selector);
};
