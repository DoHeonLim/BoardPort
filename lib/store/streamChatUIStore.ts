/**
 * File Name : lib/store/streamChatUIStore.ts
 * Description : 스트림 상세 페이지의 채팅 UI 상태(열림/확대) 관리를 위한 Zustand 스토어 팩토리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.04  임도헌   Created   stream:chat:* CustomEvent 대체를 위한 채팅 UI 전용 Store 생성
 */

import { createStore } from "zustand";

export interface StreamChatUIState {
  isChatOpen: boolean;
  isChatExpanded: boolean;
}

export interface StreamChatUIActions {
  openChat: () => void;
  closeChat: () => void;
  setChatExpanded: (expanded: boolean) => void;
  toggleChatExpanded: () => void;
}

export type StreamChatUIStore = StreamChatUIState & StreamChatUIActions;

/**
 * 스트림 상세 채팅 UI 상태 관리 Zustand 스토어 팩토리
 *
 * [상태 구조 및 제어 로직]
 * - 데스크톱 환경의 채팅창 열림/닫힘(`isChatOpen`) 상태 및 모바일 환경의 채팅창 확대(`isChatExpanded`) 상태 캡슐화
 * - 토글 액션(`toggleChatExpanded`) 및 상태 초기화 액션(`closeChat`) 제공
 * - Next.js SSR 환경 내 전역 상태 오염을 방지하기 위한 Store 생성 팩토리 패턴(`createStore`) 적용
 */
export const createStreamChatUIStore = () =>
  createStore<StreamChatUIStore>()((set) => ({
    isChatOpen: true,
    isChatExpanded: false,
    openChat: () => set(() => ({ isChatOpen: true })),
    closeChat: () => set(() => ({ isChatOpen: false, isChatExpanded: false })),
    setChatExpanded: (expanded) => set(() => ({ isChatExpanded: expanded })),
    toggleChatExpanded: () =>
      set((state) => ({ isChatExpanded: !state.isChatExpanded })),
  }));
