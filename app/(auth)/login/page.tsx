/**
 * File Name : app/(auth)/login/page.tsx
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
 * 2026.01.10  임도헌   Modified  Harbor Minimalism Theme 적용
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.24  임도헌   Modified  로고 추가
 */

import Logo from "@/components/ui/Logo";
import LoginForm from "@/features/auth/components/form/LoginForm";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 로그인 페이지 컴포넌트
 *
 * - `callbackUrl` 쿼리 파라미터를 받아 로그인 후 이동할 경로를 결정
 * - `sanitizeCallbackUrl`을 통해 외부 도메인이나 악성 스크립트가 포함된 URL을 내부 경로로 정화
 * - 로그인 폼(`LoginForm`)을 렌더링
 *
 * @param {Object} searchParams - URL 쿼리 파라미터
 * @param {string} searchParams.callbackUrl - 로그인 후 이동할 경로 (Optional)
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const raw = searchParams?.callbackUrl ?? "/profile";

  // Open Redirect 방지: 외부 도메인이나 악성 스크립트가 포함된 URL을 내부 경로로 정화
  const callbackUrl = sanitizeCallbackUrl(raw);

  return (
    <div className="flex flex-col min-h-screen px-page-x py-page-y bg-background transition-colors">
      {/* Header Area */}
      <div className="flex flex-col items-center gap-4 mt-10 mb-8">
        <div className="p-3 bg-surface rounded-2xl shadow-sm border border-border">
          <Logo variant="symbol" size={60} />
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
