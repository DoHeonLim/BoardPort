/**
 * File Name : app/(public)/forgot-password/page.tsx
 * Description : 비밀번호 찾기 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   이메일 기반 비밀번호 재설정 메일 요청 페이지 추가
 * 2026.03.18  임도헌   Modified  callbackUrl 쿼리를 정규화해 재설정 후 재로그인 복귀 경로를 유지
 * 2026.03.23  임도헌   Modified  인증 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 인증 헤더 타이포 계층을 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/forgot-password/page.tsx 에서 app/(public)/forgot-password/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.13  임도헌   Modified  인증 공통 셸을 적용해 main 랜드마크와 상단 로고 우선 로드 패턴을 통일
 * 2026.04.17  임도헌   Modified  callbackUrl 정규화와 공통 셸 책임이 페이지 설명에 드러나도록 주석 보강
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import AuthPageShell from "@/features/auth/components/AuthPageShell";
import ForgotPasswordForm from "@/features/auth/components/form/ForgotPasswordForm";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 비밀번호 찾기 페이지
 * - callbackUrl을 안전한 내부 경로로 정규화
 * - 인증 공통 셸 안에 비밀번호 찾기 폼을 렌더링
 * - 재설정 후 로그인 복귀 문맥을 폼까지 그대로 전달
 */
export default async function ForgotPasswordPage(props: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = sanitizeCallbackUrl(
    searchParams?.callbackUrl ?? "/profile"
  );

  return (
    <AuthPageShell
      title="비밀번호 찾기"
      description="가입한 이메일로 비밀번호 재설정 링크를 보내드립니다"
    >
      <ForgotPasswordForm callbackUrl={callbackUrl} />
    </AuthPageShell>
  );
}
