/**
 * File Name : features/chat/components/Chatbutton.tsx
 * Description : 채팅 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.19  임도헌   Created
 * 2024.12.19  임도헌   Modified  채팅 버튼 컴포넌트 추가
 * 2025.07.13  임도헌   Modified  createChatRoomAction으로 이름 변경(비즈니스 로직 변경했음)
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 btn-primary 적용
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import { createChatRoomAction } from "@/features/product/actions/chat";
import { cn } from "@/lib/utils";

/**
 * 채팅방 생성/이동 버튼
 * - 클릭 시 `createChatRoomAction`을 호출하여 채팅방을 생성하고 해당 방으로 이동합니다.
 * - 제품 상세 페이지 하단 등에서 사용됩니다.
 */
export default function ChatButton({ productId }: { productId: number }) {
  return (
    <form action={() => createChatRoomAction(productId)} className="w-full">
      <button
        className={cn(
          "w-full h-12 rounded-xl font-bold text-base shadow-sm",
          "btn-primary"
        )}
      >
        채팅으로 거래하기
      </button>
    </form>
  );
}
