/**
 * File Name : components/chat/Chatbutton
 * Description : 채팅 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.19  임도헌   Created
 * 2024.12.19  임도헌   Modified  채팅 버튼 컴포넌트 추가
 * 2025.07.13  임도헌   Modified  createChatRoomAction으로 이름 변경(비즈니스 로직 변경했음)
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 btn-primary 적용
 */
"use client";

import { createChatRoomAction } from "@/app/products/view/[id]/actions/chat";
import { cn } from "@/lib/utils";

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
