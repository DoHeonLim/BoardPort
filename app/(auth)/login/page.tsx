/**
 * File Name : app/(auth)/login/page
 * Description : 로그인 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  로그인 페이지 추가
 * 2024.10.04  임도헌   Modified  폼 제출 유효성 검증 추가
 * 2024.12.14  임도헌   Modified  다른 방법의 로그인 링크 추가
 * 2024.12.24  임도헌   Modified  스타일 변경
 * 2025.04.29  임도헌   Modified  UI 수정
 * 2025.12.09  임도헌   Modified  callbackUrl sanitize 적용
 * 2026.01.10  임도헌   Modified  [Philosophy] Harbor Minimalism Theme 적용
 */

import LoginForm from "@/components/auth/form/LoginForm";
import { sanitizeCallbackUrl } from "@/lib/auth/safeRedirect";
import { LifebuoyIcon } from "@heroicons/react/24/outline";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const raw = searchParams?.callbackUrl ?? "/profile";
  const callbackUrl = sanitizeCallbackUrl(raw);

  return (
    <div className="flex flex-col min-h-screen px-page-x py-page-y bg-background transition-colors">
      {/* Header Area */}
      <div className="flex flex-col items-center gap-4 mt-10 mb-8">
        <div className="p-3 bg-surface rounded-2xl shadow-sm border border-border">
          <LifebuoyIcon className="size-8 text-brand dark:text-brand-light" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">항해 준비</h1>
          <p className="text-sm text-muted">
            이메일로 로그인하여 항해를 시작하세요
          </p>
        </div>
      </div>

      {/* Form Area */}
      <div className="w-full max-w-sm mx-auto">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
