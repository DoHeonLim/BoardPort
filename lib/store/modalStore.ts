/**
 * File Name : lib/store/modalStore.ts
 * Description : 전역 모달 상태 관리를 위한 Zustand 스토어 팩토리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.01  임도헌   Created   이벤트 버스(CustomEvent) 기반의 모달 제어를 Zustand로 대체
 */

import { createStore } from "zustand";

export type ModalType =
  | "password"
  | "email"
  | "block"
  | "withdraw"
  | "review"
  | "badge"
  | "reservation";

export interface ModalState {
  modals: Record<ModalType, boolean>;
}

export interface ModalActions {
  openModal: (type: ModalType) => void;
  closeModal: (type: ModalType) => void;
  closeAll: () => void;
}

export type ModalStore = ModalState & ModalActions;

/**
 * 전역 모달 상태 관리 Zustand 스토어 팩토리
 *
 * [상태 구조 및 제어 로직]
 * - 기존 CustomEvent 기반 이벤트 버스 방식을 대체하여 메모리 누수 위험 차단
 * - Next.js SSR 환경 내 요청 간 상태 오염(Cross-Request Pollution) 방지를 위한 팩토리 함수(`createModalStore`) 패턴 적용
 * - 각 모달별(password, email, block 등) 열림/닫힘 상태 캡슐화 및 제어 액션 제공
 */
export const createModalStore = () => {
  return createStore<ModalStore>()((set) => ({
    modals: {
      password: false,
      email: false,
      block: false,
      withdraw: false,
      review: false,
      badge: false,
      reservation: false,
    },
    openModal: (type) =>
      set((state) => ({ modals: { ...state.modals, [type]: true } })),
    closeModal: (type) =>
      set((state) => ({ modals: { ...state.modals, [type]: false } })),
    closeAll: () =>
      set(() => ({
        modals: {
          password: false,
          email: false,
          block: false,
          withdraw: false,
          review: false,
          badge: false,
          reservation: false,
        },
      })),
  }));
};
