/**
 * File Name : app/(auth)/onboarding/page.tsx
 * Description : 인증 직후 최소 설정 온보딩 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   로그인 직후 지역/닉네임/이메일 누락 계정을 보완하는 1회 온보딩 페이지 추가
 * 2026.03.22  임도헌   Modified  온보딩 안내 카피를 실제 보완 항목(닉네임/지역)에 맞춰 조건부로 분기
 * 2026.03.23  임도헌   Modified  온보딩 헤더 로고 카드 외곽선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.03.25  임도헌   Modified  소셜 자동 생성 닉네임 보완 강제를 query flag(setupUsername)로 받아 폼 상태에 반영
 */

import { redirect } from "next/navigation";
import Logo from "@/components/ui/Logo";
import getSession from "@/lib/session";
import OnboardingForm from "@/features/auth/components/form/OnboardingForm";
import {
  getAuthOnboardingState,
} from "@/features/auth/service/onboarding";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { next?: string; setupUsername?: string };
}) {
  const session = await getSession();
  const next = sanitizeCallbackUrl(searchParams?.next ?? "/profile");
  const safeNext = next.startsWith("/onboarding") ? "/profile" : next;
  const forceUsernameSetup = searchParams?.setupUsername === "1";

  if (!session?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(safeNext)}`)}`);
  }

  const onboarding = await getAuthOnboardingState(session.id, {
    forceUsernameSetup,
  });

  if (!onboarding) {
    redirect("/login");
  }

  if (!onboarding.needsOnboarding) {
    redirect(safeNext);
  }

  const onboardingGuide = (() => {
    if (onboarding.needsUsernameSetup && onboarding.needsLocationSetup) {
      return "활동 지역과 기본 프로필만 마치면 바로 출항할 수 있습니다.";
    }
    if (onboarding.needsLocationSetup) {
      return "활동 지역만 정하면 바로 출항할 수 있습니다.";
    }
    if (onboarding.needsUsernameSetup) {
      return "기본 프로필만 마치면 바로 출항할 수 있습니다.";
    }
    return "기본 준비만 마치면 바로 출항할 수 있습니다.";
  })();

  return (
    <div className="flex min-h-screen flex-col bg-background px-page-x py-page-y transition-colors">
      <div className="mt-10 mb-8 flex flex-col items-center gap-4">
        <div className="rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm">
          <Logo variant="symbol" size={60} />
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">항해 준비 마무리</h1>
          <p className="text-sm text-muted">
            {onboardingGuide}
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm">
        <OnboardingForm
          onboarding={onboarding}
          next={safeNext}
          forceUsernameSetup={forceUsernameSetup}
        />
      </div>
    </div>
  );
}
