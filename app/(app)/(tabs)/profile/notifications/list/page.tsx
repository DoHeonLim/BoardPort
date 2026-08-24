/**
 * File Name : app/(app)/(tabs)/profile/notifications/list/page.tsx
 * Description : 사용자의 알림 목록 페이지 (읽음 처리 기능 포함)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 페이지 구현
 * 2026.02.13  임도헌   Modified  키워드 알림 관리 섹션 추가
 * 2026.02.21  임도헌   Modified  유저 위치 정보(getUserLocation) 로드 및 주입
 * 2026.03.12  임도헌   Modified  알림 목록을 우선 노출하고 키워드 관리를 접이식 하단 섹션으로 재배치
 * 2026.03.12  임도헌   Modified  잘못된 page 쿼리값이 들어와도 최소 1페이지부터 조회하도록 방어
 * 2026.03.12  임도헌   Modified  알림 센터 헤더를 flat 톤으로 통일하고 일반 사용자용 페이지네이션 구조로 전환
 * 2026.03.12  임도헌   Modified  returnTo 쿼리 기반 뒤로가기 복귀 경로 지원
 * 2026.03.13  임도헌   Modified  로그인 가드 진입 시 page/returnTo를 포함한 현재 알림 센터 경로를 callbackUrl로 유지
 * 2026.03.15  임도헌   Modified  키워드 알림 관리를 알림 설정 페이지로 이동해 알림 목록은 확인 흐름에 집중
 * 2026.03.16  임도헌   Modified  알림 설정 요약 카드를 제거하고 필터를 서버 기준 전체 개수/결과로 정리
 * 2026.03.16  임도헌   Modified  알림 센터 키워드 버튼에서 전용 모달을 열 수 있도록 키워드/지역 데이터 주입 추가
 * 2026.03.18  임도헌   Modified  로그인 가드 callbackUrl에 포함하는 returnTo도 먼저 정규화해 중첩 복귀 경로를 안정화
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/notifications/list/page.tsx 에서 app/(app)/(tabs)/profile/notifications/list/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified  알림 센터 상단 헤더 높이를 모바일 서브 헤더 기준으로 정리
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import BackButton from "@/components/global/BackButton";
import NotificationListContainer from "@/features/notification/components/NotificationListContainer";
import { getNotificationsAction } from "@/features/notification/actions/list";
import { getMyKeywordAlerts } from "@/features/notification/service/keyword";
import { getUserLocation } from "@/features/user/service/profile";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

export const dynamic = "force-dynamic";

/**
 * 내 알림함 페이지
 *
 * [기능]
 * - 수신한 알림 목록을 확인하고 읽음 처리를 수행
 * - 알림 목록 확인 흐름에 집중하고 키워드 알림 관리는 설정 페이지에서 담당
 * - 잘못된 page 쿼리값이 들어와도 최소 1페이지부터 조회
 * - filter 쿼리가 있으면 선택한 그룹 기준 서버 페이지네이션 결과를 조회
 * - returnTo 쿼리가 있으면 뒤로가기 폴백 경로로 우선 사용
 *
 * @param {Object} props - 페이지 props
 * @param props - 페이지·필터·복귀 경로를 담은 Promise 기반 라우트 속성
 */
export default async function NotificationListPage(props: {
  searchParams: Promise<{ page?: string; filter?: string; returnTo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();
  const safeReturnTo = searchParams.returnTo
    ? sanitizeCallbackUrl(searchParams.returnTo)
    : undefined;
  const callbackParams = new URLSearchParams();
  if (searchParams.page) {
    callbackParams.set("page", searchParams.page);
  }
  if (searchParams.filter) {
    callbackParams.set("filter", searchParams.filter);
  }
  if (safeReturnTo) {
    // 로그인 가드에서도 복귀 경로를 먼저 정규화해 중첩 returnTo 전달 안정화
    callbackParams.set("returnTo", safeReturnTo);
  }
  const callbackUrl = callbackParams.size
    ? `/profile/notifications/list?${callbackParams.toString()}`
    : "/profile/notifications/list";

  if (!session?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const page = Number.isFinite(Number(searchParams.page))
    ? Math.max(1, Math.floor(Number(searchParams.page)))
    : 1;
  const returnTo = sanitizeCallbackUrl(searchParams.returnTo ?? "/profile");
  const [notiResult, keywordAlerts, userLocation] = await Promise.all([
    getNotificationsAction(page, searchParams.filter),
    getMyKeywordAlerts(session.id),
    getUserLocation(session.id),
  ]);

  if (!notiResult.success) {
    return <div>알림을 불러오는 데 실패했습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      <header className="sticky top-0 z-30 h-[52px] w-full border-b border-border-subtle bg-background shadow-sm">
        <div className="mx-auto flex h-full max-w-mobile items-center gap-3 px-4">
          <BackButton fallbackHref={returnTo} variant="appbar" />
          <h1 className="text-lg font-bold text-primary">알림 센터</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-mobile space-y-6 px-page-x py-6">
        <section>
          <NotificationListContainer
            data={notiResult.data}
            keywordAlerts={keywordAlerts}
            userLocation={userLocation ?? { regionRange: "ALL" }}
          />
        </section>
      </div>
    </div>
  );
}
