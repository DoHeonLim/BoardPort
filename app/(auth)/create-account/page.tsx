/**
 * File Name : app/(auth)/create-account/page.tsx
 * Description : 회원가입 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  회원가입 페이지 추가
 * 2024.10.04  임도헌   Modified  폼 제출 유효성 검증 추가
 * 2024.12.14  임도헌   Modified  다른 방법의 로그인 링크 추가
 * 2025.04.29  임도헌   Modified  UI 수정
 * 2026.01.10  임도헌   Modified  Harbor Minimalism Theme 적용
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.24  임도헌   Modified  로고 추가
 * 2026.03.13  임도헌   Modified  callbackUrl 쿼리를 정규화해 회원가입 성공 후 복귀 경로로 사용하도록 보강
 * 2026.03.23  임도헌   Modified  인증 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 */

import Logo from "@/components/ui/Logo";
import CreateAccountForm from "@/features/auth/components/form/CreateAccountForm";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 회원가입 페이지 컴포넌트
 *
 * - 신규 사용자 등록을 위한 페이지
 * - callbackUrl 쿼리를 안전하게 정규화해 회원가입 완료 후 복귀 경로로 사용
 * - 회원가입 폼(`CreateAccountForm`)을 렌더링
 *
 * @param {Object} [props.searchParams] - URL 쿼리 파라미터
 * @param {string} [props.searchParams.callbackUrl] - 회원가입 완료 후 복귀할 내부 경로
 */
export default function CreateAccountPage({
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
          <h1 className="text-2xl font-bold text-primary">선원 등록</h1>
          <p className="text-sm text-muted">
            새로운 항해를 위한 선원증을 발급받으세요
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <CreateAccountForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
