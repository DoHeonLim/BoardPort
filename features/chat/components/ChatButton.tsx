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
 * 2026.02.04  임도헌   Modified  useTransition 도입 및 차단 유저 에러 핸들링(Toast) 추가
 */
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createChatRoomAction } from "@/features/product/actions/chat";
import { cn } from "@/lib/utils";

/**
 * 채팅방 생성 및 이동 버튼 컴포넌트
 *
 * [동작 원리]
 * 1. `useTransition`을 사용하여 서버 액션 실행 중 로딩 상태를 관리
 * 2. `createChatRoomAction` 호출 시 발생할 수 있는 비즈니스 예외(예: 차단된 상대)를 catch
 * 3. 예외 발생 시 `sonner` 토스트를 통해 사용자에게 사유를 안내
 *
 * @param {Object} props
 * @param {number} props.productId - 채팅을 시작할 대상 제품 ID
 */
export default function ChatButton({ productId }: { productId: number }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await createChatRoomAction(productId);
      } catch (e) {
        // createChatRoomAction에서 throw new Error("차단된...") 발생 시 캐치
        toast.error(
          e instanceof Error ? e.message : "채팅방을 열 수 없습니다."
        );
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "w-full h-12 rounded-xl font-bold text-base shadow-sm",
        "btn-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {isPending ? "이동 중..." : "채팅으로 거래하기"}
    </button>
  );
}
