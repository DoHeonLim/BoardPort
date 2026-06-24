/**
 * File Name : app/(app)/(tabs)/profile/notifications/setting/page.tsx
 * Description : 알림 설정 페이지 (NotificationPreferences + 푸시 구독)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   알림 설정 전용 페이지 추가
 * 2025.12.03  임도헌   Modified  stream 알림 추가
 * 2026.01.16  임도헌   Modified  [Rule 3.2] max-w-mobile 및 시맨틱 토큰 적용
 * 2026.01.29  임도헌   Modified  알림 설정 페이지 주석 보강 및 구조 설명 추가
 * 2026.02.08  임도헌   Modified  알림 목록 페이지 구현으로 인해 경로 변경 (settings)
 * 2026.02.12  임도헌   Modified  키워드 알림 설정 추가
 * 2026.03.07  임도헌   Modified  로그인 콜백 경로를 실제 설정 페이지로 정정
 * 2026.03.12  임도헌   Modified  알림 설정 헤더를 flat 톤과 border-border-subtle 기준으로 통일
 * 2026.03.13  임도헌   Modified  returnTo 쿼리를 정규화해 저장/뒤로가기 복귀 경로로 사용
 * 2026.03.15  임도헌   Modified  키워드 알림 관리를 목록 페이지에서 설정 페이지로 통합
 * 2026.03.16  임도헌   Modified  알림 센터 키워드 바로가기 연결을 위한 섹션 앵커 추가
 * 2026.03.17  임도헌   Modified  키워드 알림 중복 관리 방지를 위해 설정 페이지는 요약/진입점 중심으로 축약
 * 2026.03.18  임도헌   Modified  세션 null 케이스의 로그인 가드 optional chaining 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/notifications/setting/page.tsx 에서 app/(app)/(tabs)/profile/notifications/setting/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.18  임도헌   Modified  푸시 토글을 지연 로딩하고 설정 폼은 서버 렌더링으로 분리해 초기 렌더 비용 완화
 * 2026.05.30  임도헌   Modified  알림 설정 상단 헤더 높이를 모바일 서브 헤더 기준으로 정리
 */

import Link from "next/link";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import db from "@/lib/db";
import BackButton from "@/components/global/BackButton";
import NotificationSettingsClient from "@/features/notification/components/NotificationSettingsClient";
import { getUserLocation } from "@/features/user/service/profile";
import { getMyKeywordAlerts } from "@/features/notification/service/keyword";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const NotificationPushSection = dynamic(
  () => import("@/features/notification/components/NotificationPushSection"),
  {
    ssr: false,
    loading: () => (
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold text-primary">푸시 알림</h2>
        <div className="panel flex items-center justify-between p-4">
          <div className="space-y-1">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-dim/70" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-dim/50" />
          </div>
          <div className="h-6 w-11 animate-pulse rounded-full bg-surface-dim/70" />
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted">
          전체 푸시를 끄면 기기 알림은 오지 않습니다.
        </p>
      </section>
    ),
  }
);

/**
 * 알림 수신 설정 페이지
 * - 알림 종류별(채팅, 거래 등) 수신 동의 여부 설정
 * - 방해 금지 시간 설정 제공
 * - 키워드 알림은 요약 정보와 알림 센터 빠른 관리 진입점 제공
 */
export default async function NotificationSettingsPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string; saveError?: string };
}) {
  const returnTo = sanitizeCallbackUrl(searchParams?.returnTo ?? "/profile");

  const session = await getSession();
  if (!session?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/profile/notifications/setting?returnTo=${encodeURIComponent(returnTo)}`
      )}`
    );
  }

  const userId = session.id;

  const [prefs, keywordAlerts, userLocation] = await Promise.all([
    // 설정 레코드가 아직 없는 기존 계정의 페이지 진입 시 기본 선호도 보장
    db.notificationPreferences.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        chat: true,
        trade: true,
        review: true,
        badge: true,
        stream: true,
        system: true,
        pushEnabled: true,
      },
    }),
    getMyKeywordAlerts(userId),
    getUserLocation(userId),
  ]);
  const keywordManageHref = `/profile/notifications/list?returnTo=${encodeURIComponent(
    `/profile/notifications/setting?returnTo=${encodeURIComponent(returnTo)}`
  )}`;

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 h-[52px] w-full border-b border-border-subtle bg-background shadow-sm">
        <div className="mx-auto max-w-mobile h-full flex items-center px-4 gap-3">
          <BackButton fallbackHref={returnTo} variant="appbar" />
          <h1 className="text-lg font-bold text-primary">알림 설정</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-mobile space-y-6 px-page-x py-6">
        <NotificationPushSection />
        <NotificationSettingsClient
          prefs={prefs}
          returnTo={returnTo}
          saveError={searchParams?.saveError === "1"}
        />
        <section
          className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm"
          style={{ contentVisibility: "auto", containIntrinsicSize: "168px" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="size-5 text-brand dark:text-brand-light" />
                <h2 className="text-base font-bold text-primary">
                  키워드 알림 관리
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                {keywordAlerts.length}개 등록됨
                {userLocation?.region2
                  ? ` · 기본 지역 ${userLocation.region2}`
                  : userLocation?.region1
                    ? ` · 기본 지역 ${userLocation.region1}`
                    : ""}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                키워드 등록과 삭제는 알림 센터의 전용 키워드 모달에서 빠르게
                관리할 수 있습니다.
              </p>
            </div>
            <Link
              href={keywordManageHref}
              prefetch={false}
              className="appbar-link-btn shrink-0"
            >
              관리하기
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}


