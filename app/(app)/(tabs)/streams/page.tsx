/**
 * File Name : app/(app)/(tabs)/streams/page.tsx
 * Description : 라이브 스트리밍 탭 페이지 (URL 기반 탭 + 검색 + 무한스크롤)
 * Author : 임도헌
 *
 * History
 * 2024.04.18  임도헌   Modified  스트리밍 상태 정보 전달 추가
 * 2024.11.12  임도헌   Created
 * 2024.11.12  임도헌   Modified  라이브 페이지 추가
 * 2024.11.19  임도헌   Modified  캐싱 기능 추가
 * 2024.11.21  임도헌   Modified  리스트 결과 값 스타일 수정
 * 2024.12.12  임도헌   Modified  라이브 페이지 스타일 변경
 * 2025.05.20  임도헌   Modified  카테고리 필터링 기능 추가
 * 2025.05.22  임도헌   Modified  CONNECTED 상태의 방송만 표시하도록 수정
 * 2025.05.23  임도헌   Modified  팔로우 상태 정보 추가
 * 2025.05.23  임도헌   Modified  클라이언트 코드 분리
 * 2025.08.25  임도헌   Modified  posts 페이지 형태로 기능 분리(탭/검색/리스트/Empty/추가 버튼)
 * 2025.08.25  임도헌   Modified  StreamListSection 래퍼 도입(onRequestFollow 복구, router.refresh)
 * 2025.08.25  임도헌   Modified  URL 스코프 기반 초기 로딩 + 클라이언트 무한스크롤 연결
 * 2025.09.09  임도헌   Modified  a11y(nav/role=tablist), scope 정규화 변수, 주석 보강
 * 2025.11.21  임도헌   Modified  스트리밍 리스트 페이지 캐싱 제거(dynamic SSR로 변경)
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 스코프 탭 스타일 통일
 * 2026.01.23  임도헌   Modified  Action Wrapper 제거 -> Service(getStreams) 직접 호출
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.02.08  임도헌   Modified  헤더 우측에 알림 벨(NotificationBell) 추가, 검색창과 카테고리 탭 위치 변경
 * 2026.02.13  임도헌   Modified  generateMetadata 추가
 * 2026.02.26  임도헌   Modified  헤더 UI 수정
 * 2026.03.03  임도헌   Modified  서버 컴포넌트 하이드레이션(HydrationBoundary) 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  스코프 탭 active 상태를 다크모드 대비 기준으로 재정렬
 * 2026.03.06  임도헌   Modified  상단 검색/스코프/카테고리 행의 간격과 보더 구조를 제품/게시글 탭과 유사하게 통일
 * 2026.03.06  임도헌   Modified  Suspense fallback을 실제 스트림 카드 스켈레톤 구조로 통일
 * 2026.03.11  임도헌   Modified  모바일 스트림 헤더를 제품/게시글과 동일한 2단 구조 및 스크롤 숨김 동작으로 통일
 * 2026.03.11  임도헌   Modified  헤더와 탭 영역의 글래스모피즘을 제거하고 평면형 디자인 토큰 기준으로 정리
 * 2026.03.12  임도헌   Modified  모바일 스트림 헤더를 검색/알림, 스코프, 카테고리의 3단 구조로 개편
 * 2026.03.16  임도헌   Modified  모바일 목록 영역 pull-to-refresh 지원 추가
 * 2026.03.25  임도헌   Modified  데스크톱 헤더 크롬 무게를 낮추고 콘텐츠 리듬을 정리하도록 간격/표면 강도 조정
 * 2026.03.28  임도헌   Modified  라이브/다시보기 최상단 모드를 추가하고 메인 다시보기 목록 분기를 도입
 * 2026.03.29  임도헌   Modified  다시보기는 최신/인기를 메인 정렬로 두고 팔로잉은 보조 필터로 분리
 * 2026.04.10  임도헌   Modified  app 타이포 정책에 맞춰 다시보기 팔로잉 필터 CTA weight를 500 기준으로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/streams/page.tsx 에서 app/(app)/(tabs)/streams/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.20  임도헌   Modified  다시보기 팔로잉 필터 선택 상태 대비를 높이고 모바일 제어와 active 문법을 맞춤
 * 2026.04.20  임도헌   Modified  앱 셸이 sm 폭 제약으로 전환되는 구간부터 데스크톱 헤더를 사용하도록 헤더 분기 breakpoint를 정리
 * 2026.04.20  임도헌   Modified  sm 구간 데스크톱 헤더가 뒤 콘텐츠를 비치지 않도록 반투명 헤더/카테고리 레일 표면을 불투명 톤으로 정리
 * 2026.05.08  임도헌   Modified  스트림 조회 범위 타입을 StreamScope 공용 타입으로 교체
 * 2026.05.17  임도헌   Modified  prefetch 데이터 타입을 InfiniteData로 명시
*/
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  type InfiniteData,
} from "@tanstack/react-query";
import PullToRefresh from "@/components/global/PullToRefresh";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/global/NotificationBell";
import StreamModeTabs from "@/features/stream/components/StreamModeTabs";
import StreamCategoryTabs from "@/features/search/components/StreamCategoryTabs";
import RecordingListSection from "@/features/stream/components/RecordingListSection";
import StreamMobileHeader from "@/features/stream/components/StreamMobileHeader";
import StreamSearchBarWrapper from "@/features/stream/components/StreamSearchBarWrapper";
import StreamEmptyState from "@/features/stream/components/StreamEmptyState";
import AddStreamButton from "@/features/stream/components/AddStreamButton";
import StreamListSkeleton from "@/features/stream/components/StreamListSkeleton";
import StreamListSection from "@/features/stream/components/StreamListSection";
import LiveStatusRealtimeSubscriber from "@/features/stream/components/LiveStatusRealtimeSubscriber";
import RecordingListRefreshRelay from "@/features/stream/components/RecordingListRefreshRelay";
import { getRecordingsListAction, getStreamsListAction } from "@/features/stream/actions/list";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";
import type {
  RecordingSort,
  RecordingsPage,
  StreamMode,
  StreamScope,
  StreamsPage as StreamsListPage,
} from "@/features/stream/types";

export const dynamic = "force-dynamic";

interface StreamsPageProps {
  searchParams: {
    keyword?: string;
    category?: string;
    mode?: StreamMode;
    sort?: RecordingSort;
    scope?: StreamScope;
  };
}

export const metadata: Metadata = {
  title: "등대방송 (라이브)",
  description: "실시간 보드게임 플레이와 소통 방송을 시청하세요.",
  openGraph: {
    title: "보드포트 등대방송",
    description: "보드게임 라이브 스트리밍과 다시보기",
  },
};
/**
 * 스트리밍 목록 페이지
 *
 * [기능]
 * - 세션 검증을 통한 로그인 여부 확인 및 비인가 사용자 리다이렉트 처리
 * - URL 검색 조건(키워드, 카테고리, 스코프) 기반 스트리밍 목록의 서버 프리패치(Prefetch) 적용
 * - 안 읽은 알림 개수의 서버 사이드 병렬 로드 적용
 * - 모바일/데스크톱 헤더를 분리 렌더링하여 검색/스코프/카테고리 제어를 기기별 밀도에 맞게 제공
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달 및 초기 렌더링 최적화
 */
export default async function StreamsPage({ searchParams }: StreamsPageProps) {
  const session = await getSession();
  const viewerId = session?.id ?? null;

  if (!viewerId) {
    redirect("/login?callbackUrl=/streams");
  }

  // 파라미터 정규화
  const mode = searchParams.mode === "recordings" ? "recordings" : "live";
  const scope = searchParams.scope === "following" ? "following" : "all";
  const recordingSort =
    searchParams.sort === "popular" ? "popular" : "latest";
  const category = searchParams.category?.trim() || undefined;
  const keyword = searchParams.keyword?.trim() || undefined;
  const liveQueryParams: Record<string, string> = {
    category: category ?? "",
    keyword: keyword ?? "",
  };
  const recordingQueryParams: Record<string, string> = {
    category: category ?? "",
    keyword: keyword ?? "",
    sort: recordingSort,
    scope: scope === "following" ? "following" : "",
  };

  const queryClient = getQueryClient();
  const [, unreadCount] = await Promise.all([
    // 라이브/다시보기의 서로 다른 쿼리 키/fetcher에 맞춘 현재 모드 목록만 서버 선프리패치
    mode === "recordings"
      ? queryClient.prefetchInfiniteQuery({
          queryKey: queryKeys.streams.recordingList(
            recordingSort,
            recordingQueryParams
          ),
          queryFn: () =>
            getRecordingsListAction(
              recordingSort,
              scope === "following",
              null,
              recordingQueryParams,
              viewerId
            ),
          initialPageParam: null as number | null,
        })
      : queryClient.prefetchInfiniteQuery({
          queryKey: queryKeys.streams.list(scope, liveQueryParams),
          queryFn: () =>
            getStreamsListAction(scope, null, liveQueryParams, viewerId),
          initialPageParam: null as number | null,
        }),
    getUnreadNotificationCount(),
  ]);

  const prefetchData = queryClient.getQueryData<
    InfiniteData<StreamsListPage | RecordingsPage>
  >(
    mode === "recordings"
      ? queryKeys.streams.recordingList(recordingSort, recordingQueryParams)
      : queryKeys.streams.list(scope, liveQueryParams)
  );
  const firstPage = prefetchData?.pages[0];
  const isDataEmpty =
    mode === "recordings"
      ? firstPage && "recordings" in firstPage
        ? firstPage.recordings.length === 0
        : false
      : firstPage && "streams" in firstPage
        ? firstPage.streams.length === 0
        : false;

  // 탭 링크 빌더
  const buildHref = (nextScope: StreamScope) => {
    const sp = new URLSearchParams();
    if (mode !== "live") sp.set("mode", mode);
    if (mode === "recordings" && recordingSort !== "latest") {
      sp.set("sort", recordingSort);
    }
    if (category) sp.set("category", category);
    if (keyword) sp.set("keyword", keyword);
    if (nextScope !== "all") sp.set("scope", nextScope);
    const q = sp.toString();
    return q ? `/streams?${q}` : `/streams`;
  };

  const buildModeHref = (nextMode: StreamMode) => {
    const sp = new URLSearchParams();
    if (nextMode !== "live") sp.set("mode", nextMode);
    if (nextMode === "recordings" && recordingSort !== "latest") {
      sp.set("sort", recordingSort);
    }
    if (category) sp.set("category", category);
    if (keyword) sp.set("keyword", keyword);
    if (nextMode === "live" && scope !== "all") sp.set("scope", scope);
    const q = sp.toString();
    return q ? `/streams?${q}` : `/streams`;
  };

  const buildRecordingSortHref = (nextSort: RecordingSort) => {
    const sp = new URLSearchParams();
    sp.set("mode", "recordings");
    if (category) sp.set("category", category);
    if (keyword) sp.set("keyword", keyword);
    if (scope === "following") sp.set("scope", "following");
    if (nextSort !== "latest") sp.set("sort", nextSort);
    const q = sp.toString();
    return q ? `/streams?${q}` : `/streams`;
  };

  const buildRecordingFollowingHref = (nextFollowingOnly: boolean) => {
    const sp = new URLSearchParams();
    sp.set("mode", "recordings");
    if (category) sp.set("category", category);
    if (keyword) sp.set("keyword", keyword);
    if (recordingSort !== "latest") sp.set("sort", recordingSort);
    if (nextFollowingOnly) sp.set("scope", "following");
    const q = sp.toString();
    return q ? `/streams?${q}` : `/streams`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors pb-24">
      <LiveStatusRealtimeSubscriber />
      <RecordingListRefreshRelay />

      <div className="sm:hidden">
        <StreamMobileHeader
          viewerId={viewerId!}
          unreadCount={unreadCount}
          mode={mode}
          scope={scope}
          recordingSort={recordingSort}
          category={category}
          keyword={keyword}
        />
      </div>

      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background sm:block">
        <div className="px-3 py-2 md:px-5 md:py-2.5 lg:px-6">
          <div className="flex items-center gap-2">
            <StreamModeTabs
              mode={mode}
              liveHref={buildModeHref("live")}
              recordingsHref={buildModeHref("recordings")}
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StreamSearchBarWrapper
              className="flex-1"
              compact
              placeholder={mode === "recordings" ? "다시보기 검색" : "방송 검색"}
            />
            <div className="shrink-0">
              <NotificationBell
                userId={viewerId!}
                initialCount={unreadCount}
              />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            {mode === "live" ? (
              <nav
                aria-label="보기 범위"
                className="shrink-0 rounded-xl border border-border-subtle bg-background p-0.5"
              >
                <div className="flex items-center">
                  <Link
                    href={buildHref("all")}
                    prefetch={false}
                    className={cn(
                      "focus-ring-soft flex items-center justify-center rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,border-color,box-shadow]",
                      scope === "all"
                        ? "bg-surface text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                        : "text-muted hover:bg-surface/80 hover:text-primary"
                    )}
                  >
                    전체
                  </Link>
                  <Link
                    href={buildHref("following")}
                    prefetch={false}
                    className={cn(
                      "focus-ring-soft flex items-center justify-center rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,border-color,box-shadow]",
                      scope === "following"
                        ? "bg-surface text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                        : "text-muted hover:bg-surface/80 hover:text-primary"
                    )}
                  >
                    팔로잉
                  </Link>
                </div>
              </nav>
            ) : (
              <>
                <nav
                  aria-label="다시보기 정렬"
                  className="shrink-0 rounded-xl border border-border-subtle bg-background/70 p-0.5"
                >
                  <div className="flex items-center">
                    <Link
                      href={buildRecordingSortHref("latest")}
                      prefetch={false}
                      className={cn(
                        "focus-ring-soft flex items-center justify-center rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,border-color,box-shadow]",
                        recordingSort === "latest"
                          ? "bg-surface text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                          : "text-muted hover:bg-surface/80 hover:text-primary"
                      )}
                    >
                      최신
                    </Link>
                    <Link
                      href={buildRecordingSortHref("popular")}
                      prefetch={false}
                      className={cn(
                        "focus-ring-soft flex items-center justify-center rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,border-color,box-shadow]",
                        recordingSort === "popular"
                          ? "bg-surface text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                          : "text-muted hover:bg-surface/80 hover:text-primary"
                      )}
                    >
                      인기
                    </Link>
                  </div>
                </nav>
                <Link
                  href={buildRecordingFollowingHref(scope !== "following")}
                  prefetch={false}
                  className={cn(
                    "focus-ring-soft inline-flex h-10 shrink-0 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors",
                  scope === "following"
                    ? "border-brand/20 bg-brand/10 text-brand shadow-sm ring-1 ring-brand/20 dark:border-brand-light/25 dark:bg-brand-light/12 dark:text-brand-light dark:ring-brand-light/25"
                    : "border-border-subtle bg-background text-muted hover:bg-surface/80 hover:text-primary"
                )}
              >
                팔로잉만
              </Link>
            </>
          )}

            <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border-subtle bg-background">
              <StreamCategoryTabs
                currentCategory={category}
                compact
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <PullToRefresh className="flex-1">
        <div className="flex-1 px-page-x py-5 md:py-6">
            {isDataEmpty ? (
              <StreamEmptyState
                keyword={keyword}
                category={category}
                scope={scope}
                mode={mode}
              />
            ) : (
              <HydrationBoundary state={dehydrate(queryClient)}>
                <Suspense fallback={<StreamListSkeleton />}>
                  {mode === "recordings" ? (
                    <RecordingListSection
                      key={`recordings-${JSON.stringify(searchParams)}`}
                      sort={recordingSort}
                      followingOnly={scope === "following"}
                      searchParams={recordingQueryParams}
                      viewerId={viewerId}
                    />
                  ) : (
                    <StreamListSection
                      key={`live-${JSON.stringify(searchParams)}`}
                      scope={scope}
                      searchParams={liveQueryParams}
                      viewerId={viewerId}
                    />
                  )}
                </Suspense>
              </HydrationBoundary>
            )}
        </div>
      </PullToRefresh>
      {/* 스트리밍 추가 플로팅 버튼 (FAB) */}
      <AddStreamButton />
    </div>
  );
}

