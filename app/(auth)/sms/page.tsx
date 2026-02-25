/**
 * File Name : app/(auth)/sms/page.tsx
 * Description : SMS 로그인 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  SMS로그인 페이지 추가
 * 2024.10.04  임도헌   Modified  폼 제출 유효성 검증 추가
 * 2024.10.11  임도헌   Modified  초기 state 전화번호 추가
 * 2024.12.14  임도헌   Modified  다른 방법의 로그인 링크 추가
 * 2024.12.24  임도헌   Modified  스타일 변경
 * 2025.04.29  임도헌   Modified  UI 수정
 * 2026.01.10  임도헌   Modified  Harbor Minimalism Theme 적용
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.24  임도헌   Modified  로고 추가
 */

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import SmsForm from "@/features/auth/components/form/SmsForm";

/**
 * SMS 로그인 페이지 컴포넌트
 *
 * - 휴대폰 번호를 이용한 간편 로그인/회원가입을 지원
 * - SMS 인증 폼(`SmsForm`)을 렌더링
 */
export default function SMSLoginPage() {
  return (
    <div className="flex flex-col min-h-screen px-page-x py-page-y bg-background transition-colors">
      <div className="flex flex-col items-center gap-4 mt-10 mb-8">
        <div className="p-3 bg-surface rounded-2xl shadow-sm border border-border">
          <Logo variant="symbol" size={60} />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">등대 신호</h1>
          <p className="text-sm text-muted">
            휴대폰 번호로 빠르게 로그인하세요
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <SmsForm />

        <div className="mt-6 text-center text-sm text-muted">
          다른 방법으로 항해하시겠어요?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand dark:text-brand-light hover:underline transition-colors"
          >
            이메일 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
