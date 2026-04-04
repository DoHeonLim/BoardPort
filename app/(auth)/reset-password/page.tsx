/**
 * File Name : app/(auth)/reset-password/page.tsx
 * Description : 비밀번호 재설정 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   토큰 검증 기반 비밀번호 재설정 페이지 추가
 * 2026.03.18  임도헌   Modified  callbackUrl 쿼리를 정규화해 재설정 완료 후 재로그인 복귀 경로를 유지
 * 2026.03.23  임도헌   Modified  인증 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/Logo";
import ResetPasswordForm from "@/features/auth/components/form/ResetPasswordForm";
import { validatePasswordResetToken } from "@/features/auth/service/passwordReset";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 비밀번호 재설정 페이지
 * - URL token 검증
 * - 유효 토큰이면 재설정 폼 렌더링
 * - 만료/무효 토큰이면 재요청 링크 노출
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string; callbackUrl?: string };
}) {
  const token = searchParams?.token?.trim();
  const callbackUrl = sanitizeCallbackUrl(searchParams?.callbackUrl ?? "/profile");
  if (!token) {
    redirect(
      `/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
  }

  const validation = await validatePasswordResetToken(token);

  return (
    <div className="flex flex-col min-h-screen px-page-x py-page-y bg-background transition-colors">
      <div className="flex flex-col items-center gap-4 mt-10 mb-8">
        <div className="p-3 bg-surface rounded-2xl shadow-sm border border-border-subtle">
          <Logo variant="symbol" size={60} />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">새 비밀번호 설정</h1>
          <p className="text-sm text-muted">
            안전한 새 비밀번호를 입력하고 다시 항해를 시작하세요
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto">
        {validation.success ? (
          <ResetPasswordForm token={token} callbackUrl={callbackUrl} />
        ) : (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-5 text-sm text-danger">
            <p>{validation.error}</p>
            <Link
              href={`/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="mt-3 inline-flex font-semibold text-brand dark:text-brand-light hover:underline"
            >
              비밀번호 찾기 다시 요청하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
