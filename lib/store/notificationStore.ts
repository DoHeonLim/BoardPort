/**
 * File Name : lib/store/notificationStore.ts
 * Description : 알림 뱃지 전역 상태 관리를 위한 Zustand 스토어 (Next.js SSR 안전형)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.28  임도헌   Created   Zustand 스토어 Factory 도입 (Event Bus 대체 및 SSR 오염 방지)
 */
import { createStore } from "zustand";

export interface NotificationState {
  unreadCount: number;
}

export interface NotificationActions {
  setUnreadCount: (count: number) => void;
  increment: () => void;
  decrement: (by: number) => void;
  clear: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;

/**
 * Zustand 스토어 팩토리 함수
 *
 * [기술적 의사결정]
 * Next.js의 서버 환경(SSR)에서 일반적인 Zustand 방식(전역 변수 할당)을 사용할 경우,
 * 여러 유저의 요청(Request) 간에 스토어 상태가 공유되는 상태 오염(Cross-Request State Pollution) 문제가 발생할 수 있음
 * 이를 방지하기 위해 스토어를 전역 변수가 아닌 팩토리 함수로 감싸, 매 요청(또는 Provider 마운트)마다 독립된 인스턴스를 생성하도록 설계
 *
 * @param {NotificationState} initialState - 초기 알림 카운트 상태
 * @returns Zustand Store Instance
 */
export const createNotificationStore = (
  initialState: NotificationState = { unreadCount: 0 }
) => {
  return createStore<NotificationStore>()((set) => ({
    ...initialState,

    // 초기화 및 서버와의 명시적 카운트 동기화
    setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

    // 알림 수신 시 뱃지 카운트 1 증가
    increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

    // 채팅 읽음 처리 시 전달받은 개수만큼 동적으로 차감 (음수 방지 로직 포함)
    decrement: (by) =>
      set((state) => ({ unreadCount: Math.max(0, state.unreadCount - by) })),

    // '모두 읽음' 처리 시 카운트를 0으로 초기화
    clear: () => set({ unreadCount: 0 }),
  }));
};
