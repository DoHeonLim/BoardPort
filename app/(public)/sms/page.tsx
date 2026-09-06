/**
 * File Name : app/(public)/sms/page.tsx
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
 * 2026.03.12  임도헌   Modified  callbackUrl 정규화 및 로그인 복귀 경로 전달 추가
 * 2026.03.23  임도헌   Modified  인증 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 인증 헤더와 보조 링크 타이포를 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/sms/page.tsx 에서 app/(public)/sms/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.13  임도헌   Modified  모바일 로그인 접근성 정리를 위해 main 랜드마크와 상단 로고 우선 로드를 적용
 * 2026.04.13  임도헌   Modified  인증 공통 셸로 헤더 구조를 통일해 auth 페이지 간 레이아웃 중복을 제거
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 * 2026.08.30  임도헌   Modified  기본 프로필 복귀 경로를 이메일 로그인 링크에서 생략
 */

import Link from "next/link";
import AuthPageShell from "@/features/auth/components/AuthPageShell";
import {
  buildAuthFlowHref,
  sanitizeCallbackUrl,
} from "@/features/auth/utils/redirect";
import SmsForm from "@/features/auth/components/form/SmsForm";

/**
 * SMS 로그인 페이지 컴포넌트
 *
 * - 휴대폰 번호를 이용한 간편 로그인/회원가입을 지원
 * - callbackUrl을 안전한 내부 경로로 정규화해 인증 완료 후 복귀 경로로 전달
 * - SMS 인증 폼(`SmsForm`)을 렌더링
 */
export default async function SMSLoginPage(props: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = sanitizeCallbackUrl(
    searchParams?.callbackUrl ?? "/profile"
  );
  const loginHref = buildAuthFlowHref("/login", callbackUrl);

  return (
    <AuthPageShell
      title="등대 신호"
      description="휴대폰 번호로 빠르게 로그인하세요"
    >
      <SmsForm callbackUrl={callbackUrl} />

      <div className="mt-6 text-center text-sm text-muted">
        다른 방법으로 항해하시겠어요?{" "}
        <Link
          href={loginHref}
          className="focus-ring-soft rounded-md px-1 py-0.5 font-medium text-brand transition-colors hover:underline dark:text-brand-light"
        >
          이메일 로그인
        </Link>
      </div>
    </AuthPageShell>
  );
}
