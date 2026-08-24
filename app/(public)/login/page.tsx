/**
 * File Name : app/(public)/login/page.tsx
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
 * 2026.03.08  임도헌   Modified  소셜 로그인 콜백 에러 코드를 사용자 메시지로 변환해 로그인 화면에 표시
 * 2026.03.12  임도헌   Modified  callbackUrl 정규화와 초기 에러 전달 흐름 명확화
 * 2026.03.12  임도헌   Modified  소셜 로그인 에러 메시지 매핑을 auth 유틸로 분리
 * 2026.03.23  임도헌   Modified  인증 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 인증 헤더 타이포 계층을 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/login/page.tsx 에서 app/(public)/login/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.13  임도헌   Modified  모바일 Lighthouse 대응으로 main 랜드마크와 상단 로고 우선 로드를 적용
 * 2026.04.13  임도헌   Modified  인증 공통 셸로 헤더 구조를 통일해 auth 페이지 간 레이아웃 중복을 제거
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import AuthPageShell from "@/features/auth/components/AuthPageShell";
import LoginForm from "@/features/auth/components/form/LoginForm";
import { getLoginErrorMessage } from "@/features/auth/utils/loginError";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 로그인 페이지 컴포넌트
 *
 * [기능]
 * - callbackUrl 쿼리를 안전한 내부 경로로 정규화
 * - 소셜 로그인 콜백 에러 코드를 사용자 메시지로 변환
 * - 초기 에러 메시지와 callbackUrl을 LoginForm에 전달
 *
 * @param props - 복귀 경로와 소셜 로그인 오류를 담은 Promise 기반 라우트 속성
 */
export default async function LoginPage(props: {
  searchParams?: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const raw = searchParams?.callbackUrl ?? "/profile";
  const initialErrorMessage = getLoginErrorMessage(searchParams?.error);

  // Open Redirect 방지용 callbackUrl 정규화
  const callbackUrl = sanitizeCallbackUrl(raw);

  return (
    <AuthPageShell
      title="항해 준비"
      description="이메일로 로그인하여 항해를 시작하세요"
    >
      <LoginForm
        callbackUrl={callbackUrl}
        initialErrorMessage={initialErrorMessage}
      />
    </AuthPageShell>
  );
}
