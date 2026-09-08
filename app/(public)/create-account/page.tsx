/**
 * File Name : app/(public)/create-account/page.tsx
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
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 인증 헤더 타이포 계층을 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/create-account/page.tsx 에서 app/(public)/create-account/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.13  임도헌   Modified  회원가입 페이지의 주 콘텐츠를 main 랜드마크로 감싸 접근성 탐색을 보강
 * 2026.04.13  임도헌   Modified  모바일 Lighthouse 대응으로 상단 로고 우선 로드를 적용
 * 2026.04.13  임도헌   Modified  인증 공통 셸로 헤더 구조를 통일해 auth 페이지 간 레이아웃 중복을 제거
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import AuthPageShell from "@/features/auth/components/AuthPageShell";
import CreateAccountForm from "@/features/auth/components/form/CreateAccountForm";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 회원가입 페이지 컴포넌트
 *
 * - 신규 사용자 등록을 위한 페이지
 * - callbackUrl 쿼리를 안전하게 정규화해 회원가입 완료 후 복귀 경로로 사용
 * - 회원가입 폼(`CreateAccountForm`)을 렌더링
 *
 * @param props - 회원가입 완료 후 복귀 경로를 담은 Promise 기반 라우트 속성
 */
export default async function CreateAccountPage(props: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = sanitizeCallbackUrl(
    searchParams?.callbackUrl ?? "/profile"
  );

  return (
    <AuthPageShell
      title="선원 등록"
      description="새로운 항해를 위한 선원증을 발급받으세요"
    >
      <CreateAccountForm callbackUrl={callbackUrl} />
    </AuthPageShell>
  );
}
