/**
 * File Name : features/auth/components/SocialLogin.tsx
 * Description : 소셜 로그인 버튼 모음 (Kakao, GitHub, SMS 등)
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
 */

import Link from "next/link";
import { ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

/**
 * 소셜 로그인 버튼 묶음
 *
 * [기능]
 * - callbackUrl을 각 OAuth 시작 라우트에 전달
 * - 카카오, GitHub, SMS 로그인 진입 버튼 제공
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
  const githubHref = callbackUrl
    ? `/github/start?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/github/start";
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
      {/* GitHub 로그인 */}
      <a
        aria-label="GitHub로 계속하기"
        className={cn(baseButtonClass)}
        href={githubHref}
      >
        <svg className="size-5" viewBox="0 0 15 15" fill="currentColor">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.49933 0.25C3.49635 0.25 0.25 3.49593 0.25 7.50024C0.25 10.703 2.32715 13.4206 5.2081 14.3797C5.57084 14.446 5.70302 14.2222 5.70302 14.0299C5.70302 13.8576 5.69679 13.4019 5.69323 12.797C3.67661 13.235 3.25112 11.825 3.25112 11.825C2.92132 10.9874 2.44599 10.7644 2.44599 10.7644C1.78773 10.3149 2.49584 10.3238 2.49584 10.3238C3.22353 10.375 3.60629 11.0711 3.60629 11.0711C4.25298 12.1788 5.30335 11.8588 5.71638 11.6732C5.78225 11.205 5.96962 10.8854 6.17658 10.7043C4.56675 10.5209 2.87415 9.89918 2.87415 7.12104C2.87415 6.32925 3.15677 5.68257 3.62053 5.17563C3.54576 4.99226 3.29697 4.25521 3.69174 3.25691C3.69174 3.25691 4.30015 3.06196 5.68522 3.99973C6.26337 3.83906 6.8838 3.75895 7.50022 3.75583C8.1162 3.75895 8.73619 3.83906 9.31523 3.99973C10.6994 3.06196 11.3069 3.25691 11.3069 3.25691C11.7026 4.25521 11.4538 4.99226 11.3795 5.17563C11.8441 5.68257 12.1245 6.32925 12.1245 7.12104C12.1245 9.9063 10.4292 10.5192 8.81452 10.6985C9.07444 10.9224 9.30633 11.3648 9.30633 12.0413C9.30633 13.0102 9.29742 13.7922 9.29742 14.0299C9.29742 14.2239 9.42828 14.4496 9.79591 14.3788C12.6746 13.4179 14.75 10.7025 14.75 7.50024C14.75 3.49593 11.5036 0.25 7.49933 0.25Z"
          />
        </svg>
        <span>GitHub로 계속하기</span>
      </a>

      {/* SMS 로그인 */}
      <Link
        className={cn(
          baseButtonClass,
          "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600",
          "focus-ring-strong"
        )}
        href={smsHref}
      >
        <ChatBubbleOvalLeftEllipsisIcon className="size-5" />
        <span>SMS로 계속하기</span>
      </Link>
    </div>
  );
}
