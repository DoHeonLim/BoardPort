/**
 * File Name : app/(public)/reset-password/page.tsx
 * Description : 비밀번호 재설정 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   토큰 검증 기반 비밀번호 재설정 페이지 추가
 * 2026.03.18  임도헌   Modified  callbackUrl 쿼리를 정규화해 재설정 완료 후 재로그인 복귀 경로를 유지
 * 2026.03.23  임도헌   Modified  인증 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 인증 헤더와 오류 복구 링크 타이포를 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/reset-password/page.tsx 에서 app/(public)/reset-password/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.13  임도헌   Modified  인증 공통 셸을 적용해 main 랜드마크와 상단 로고 우선 로드 패턴을 통일
 * 2026.04.17  임도헌   Modified  callbackUrl 정규화와 공통 셸 책임이 페이지 설명에 드러나도록 주석 보강
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import AuthPageShell from "@/features/auth/components/AuthPageShell";
import ResetPasswordForm from "@/features/auth/components/form/ResetPasswordForm";
import { validatePasswordResetToken } from "@/features/auth/service/passwordReset";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 비밀번호 재설정 페이지
 * - token 쿼리를 검증해 유효한 재설정 요청만 폼으로 연결
 * - callbackUrl을 안전한 내부 경로로 정규화해 재설정 완료 후 로그인 복귀 맥락 유지
 * - `AuthPageShell` 아래에서 유효 토큰이면 재설정 폼, 아니면 재요청 링크를 렌더링
 */
export default async function ResetPasswordPage(props: {
  searchParams?: Promise<{ token?: string; callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams?.token?.trim();
  const callbackUrl = sanitizeCallbackUrl(
    searchParams?.callbackUrl ?? "/profile"
  );
  if (!token) {
    redirect(`/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const validation = await validatePasswordResetToken(token);

  return (
    <AuthPageShell
      title="새 비밀번호 설정"
      description="안전한 새 비밀번호를 입력하고 다시 항해를 시작하세요"
    >
      {validation.success ? (
        <ResetPasswordForm token={token} callbackUrl={callbackUrl} />
      ) : (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-5 text-sm text-danger">
          <p>{validation.error}</p>
          <Link
            href={`/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="focus-ring-soft mt-3 inline-flex rounded-md px-1 py-0.5 font-medium text-brand transition-colors hover:underline dark:text-brand-light"
          >
            비밀번호 찾기 다시 요청하기
          </Link>
        </div>
      )}
    </AuthPageShell>
  );
}
