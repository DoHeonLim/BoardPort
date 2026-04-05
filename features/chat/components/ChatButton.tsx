/**
 * File Name : features/chat/components/ChatButton.tsx
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
 * 2026.03.12  임도헌   Modified  채팅 상세 복귀를 위해 현재 경로를 returnTo로 함께 전달
 * 2026.03.18  임도헌   Modified  채팅 진입 전 현재 경로도 내부 경로 기준으로 정규화해 nested returnTo 예외를 완화
 * 2026.03.25  임도헌   Modified  제품 상세 전용 밀도 조정을 위해 className 주입 지원 추가
 * 2026.04.02  임도헌   Modified  채팅 진입 버튼 파일 헤더명과 JSDoc 태그 형식 정리
 */
"use client";

import { useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createChatRoomAction } from "@/features/product/actions/chat";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { cn } from "@/lib/utils";

/**
 * 채팅방 생성 및 이동 버튼 컴포넌트
 *
 * [동작 원리]
 * 1. `useTransition`을 사용하여 서버 액션 실행 중 로딩 상태를 관리
 * 2. `createChatRoomAction` 호출 시 발생할 수 있는 비즈니스 예외(예: 차단된 상대)를 catch
 * 3. 예외 발생 시 `sonner` 토스트를 통해 사용자에게 사유를 안내
 *
 * @param {{ productId: number; className?: string }} props - 채팅 대상 상품 ID와 버튼 커스텀 클래스
 * @returns {JSX.Element} 채팅방 생성 및 이동 버튼
 */
export default function ChatButton({
  productId,
  className,
}: {
  productId: number;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = () => {
    const currentQuery = searchParams.toString();
    // 채팅 복귀 문맥도 현재 내부 경로 기준으로만 전달
    const returnTo = sanitizeCallbackUrl(
      currentQuery ? `${pathname}?${currentQuery}` : pathname
    );

    startTransition(async () => {
      try {
        await createChatRoomAction(productId, returnTo);
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
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {isPending ? "이동 중..." : "채팅으로 거래하기"}
    </button>
  );
}
