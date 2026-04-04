/**
 * File Name : app/(auth)/forgot-password/page.tsx
 * Description : 비밀번호 찾기 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   이메일 기반 비밀번호 재설정 메일 요청 페이지 추가
 * 2026.03.18  임도헌   Modified  callbackUrl 쿼리를 정규화해 재설정 후 재로그인 복귀 경로를 유지
 * 2026.03.23  임도헌   Modified  인증 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 */

import Logo from "@/components/ui/Logo";
import ForgotPasswordForm from "@/features/auth/components/form/ForgotPasswordForm";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 비밀번호 찾기 페이지
 * - 이메일 기반 재설정 메일 요청 폼 렌더링
 */
export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = sanitizeCallbackUrl(searchParams?.callbackUrl ?? "/profile");

  return (
    <div className="flex flex-col min-h-screen px-page-x py-page-y bg-background transition-colors">
      <div className="flex flex-col items-center gap-4 mt-10 mb-8">
        <div className="p-3 bg-surface rounded-2xl shadow-sm border border-border-subtle">
          <Logo variant="symbol" size={60} />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">비밀번호 찾기</h1>
          <p className="text-sm text-muted">
            가입한 이메일로 비밀번호 재설정 링크를 보내드립니다
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <ForgotPasswordForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
