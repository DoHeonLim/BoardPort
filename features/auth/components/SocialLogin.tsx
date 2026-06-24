/**
 * File Name : features/auth/components/SocialLogin.tsx
 * Description : 소셜 로그인 버튼 모음 (Kakao, SMS 등)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  social-login 컴포넌트 추가
 * 2026.01.10  임도헌   Modified  [Rule 3.1] Secondary Button Style 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/auth
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.24  임도헌   Modified  카카오 로그인 버튼 추가 및 최상단 배치
 * 2026.02.24  임도헌   Modified  각 소셜로그인 컬러 수정
 * 2026.03.06  임도헌   Modified  소셜 로그인 버튼 스타일을 공통 유틸 클래스 기반으로 정리
 * 2026.03.08  임도헌   Modified  OAuth 시작 시 callbackUrl을 함께 전달하도록 보강
 * 2026.03.12  임도헌   Modified  callbackUrl 전달 규칙과 소셜 로그인 버튼 묶음 역할 명확화
 * 2026.03.25  임도헌   Modified  인증 화면에서 소셜 로그인 묶음이 과하게 강하지 않도록 높이와 타이포 무게를 조정
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 소셜 로그인 버튼 타이포 스케일을 표준화
 * 2026.04.13  임도헌   Modified  SMS 로그인 CTA의 명도 대비를 높여 접근성 기준을 보강
 * 2026.05.12  임도헌   Modified  포인터 이동 시 blur 검증으로 CTA가 한 번 막히지 않도록 focus 이동 방지 처리
 * 2026.05.16  임도헌   Modified  포인터 이벤트 핸들러를 가진 클라이언트 컴포넌트임을 명시
 * 2026.05.18  임도헌   Modified  타깃 사용자 맥락에 맞춰 GitHub 로그인 버튼을 화면에서 제거
 */
"use client";

import Link from "next/link";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { preventPointerDownFocus } from "@/lib/preventPointerDownFocus";

/**
 * 소셜 로그인 버튼 묶음
 *
 * [기능]
 * - callbackUrl을 각 OAuth 시작 라우트에 전달
 * - 카카오, SMS 로그인 진입 버튼 제공
 */
export default function SocialLogin({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  const baseButtonClass = cn(
    "flex h-11 w-full items-center justify-center gap-2.5 sm:h-input-md",
    "rounded-xl border border-border bg-surface text-primary",
    "hover:bg-surface-dim active:scale-[0.98] transition-colors motion-safe:transition-transform motion-safe:duration-150",
    "focus-ring-soft",
    "text-sm font-medium sm:text-base"
  );
  const kakaoHref = callbackUrl
    ? `/kakao/start?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/kakao/start";
  const smsHref = callbackUrl
    ? `/sms?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/sms";

  return (
    <div className="flex w-full flex-col gap-2.5">
      {/* 카카오 로그인 */}
      <a
        aria-label="카카오로 계속하기"
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-black/5 sm:h-input-md",
          "bg-[#fee500] text-black hover:bg-[#fada0a] transition-colors",
          "focus-ring-strong",
          "text-sm font-medium sm:text-base"
        )}
        href={kakaoHref}
        onPointerDown={preventPointerDownFocus}
      >
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 3C6.477 3 2 6.538 2 10.905c0 2.846 1.834 5.337 4.672 6.828l-1.002 3.738c-.068.254.218.432.428.283l4.38-2.932c.5.068 1.01.103 1.522.103 5.523 0 10-3.538 10-7.905C22 6.538 17.523 3 12 3z" />
        </svg>
        <span>카카오로 계속하기</span>
      </a>

      {/* SMS 로그인 */}
      <Link
        className={cn(
          baseButtonClass,
          "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600",
          "focus-ring-strong"
        )}
        href={smsHref}
        onPointerDown={preventPointerDownFocus}
      >
        <ChatBubbleOvalLeftEllipsisIcon className="size-5" />
        <span>SMS로 계속하기</span>
      </Link>
    </div>
  );
}
