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
 * 2026.09.01  임도헌   Modified  반환된 채팅 경로를 클라이언트 라우터로 이동해 `NEXT_REDIRECT` 토스트 노출 방지
 */
"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createChatRoomAction } from "@/features/product/actions/chat";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { cn } from "@/lib/utils";

/**
 * 채팅방 생성 및 이동 버튼 컴포넌트
 *
 * [동작 원리]
 * 1. `useTransition`을 사용하여 서버 액션 실행 중 로딩 상태를 관리
 * 2. 서버 액션이 반환한 내부 채팅 경로로 클라이언트 라우팅
 * 3. 채팅방 생성 중 발생한 비즈니스 예외만 `sonner` 토스트로 안내
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
  const router = useRouter();
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
        const chatHref = await createChatRoomAction(productId, returnTo);
        router.push(chatHref);
      } catch (e) {
        // 채팅방 생성·권한 검증에서 발생한 실제 비즈니스 오류만 안내
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
