/**
 * File Name : app/(tabs)/streams/page.tsx
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
 */
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";
import NotificationBell from "@/components/global/NotificationBell";
import StreamCategoryTabs from "@/features/search/components/StreamCategoryTabs";
import StreamSearchBarWrapper from "@/features/stream/components/StreamSearchBarWrapper";
import StreamEmptyState from "@/features/stream/components/StreamEmptyState";
import AddStreamButton from "@/features/stream/components/AddStreamButton";
import StreamListSection from "@/features/stream/components/StreamListSection";
import LiveStatusRealtimeSubscriber from "@/features/stream/components/LiveStatusRealtimeSubscriber";
import { getStreamsListAction } from "@/features/stream/actions/list";
import { getUnreadNotificationCount } from "@/features/notification/actions/count";

export const dynamic = "force-dynamic";

interface StreamsPageProps {
  searchParams: {
    keyword?: string;
    category?: string;
    scope?: "all" | "following";
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
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달 및 초기 렌더링 최적화
 */
export default async function StreamsPage({ searchParams }: StreamsPageProps) {
  const session = await getSession();
  const viewerId = session?.id ?? null;

  if (!viewerId) {
    redirect("/login?callbackUrl=/streams");
  }

  // 파라미터 정규화
  const scope = searchParams.scope === "following" ? "following" : "all";
  const category = searchParams.category?.trim() || undefined;
  const keyword = searchParams.keyword?.trim() || undefined;

  const queryParams = { category: category ?? "", keyword: keyword ?? "" };

  const queryClient = getQueryClient();
  const [, unreadCount] = await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.streams.list(scope, queryParams),
      queryFn: () => getStreamsListAction(scope, null, queryParams, viewerId),
      initialPageParam: null as number | null,
    }),
    getUnreadNotificationCount(),
  ]);

  const prefetchData = queryClient.getQueryData<any>(
    queryKeys.streams.list(scope, queryParams)
  );
  const isDataEmpty = prefetchData?.pages[0]?.streams.length === 0;

  // 탭 링크 빌더
  const buildHref = (nextScope: "all" | "following") => {
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (keyword) sp.set("keyword", keyword);
    if (nextScope !== "all") sp.set("scope", nextScope);
    const q = sp.toString();
    return q ? `/streams?${q}` : `/streams`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors pb-24">
      <LiveStatusRealtimeSubscriber />

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        {/* 1단: 검색 및 알림 벨 */}
        <div className="flex items-center gap-3 p-4 pb-2">
          <StreamSearchBarWrapper />
          <div className="shrink-0">
            <NotificationBell userId={viewerId!} initialCount={unreadCount} />
          </div>
        </div>

        {/* 2단: 페이지 스코프 선택 (전체 / 팔로잉) */}
        <nav aria-label="보기 범위" className="px-4 py-2">
          <div className="flex p-1 bg-surface-dim dark:bg-neutral-800/50 rounded-xl border border-border shadow-inner">
            <Link
              href={buildHref("all")}
              className={cn(
                "flex-1 flex justify-center items-center py-2 text-sm font-bold rounded-lg transition-all",
                scope === "all"
                  ? "bg-surface text-brand dark:text-brand-light shadow-md"
                  : "text-muted hover:text-primary"
              )}
            >
              전체 방송
            </Link>
            <Link
              href={buildHref("following")}
              className={cn(
                "flex-1 flex justify-center items-center py-2 text-sm font-bold rounded-lg transition-all",
                scope === "following"
                  ? "bg-surface text-brand dark:text-brand-light shadow-md"
                  : "text-muted hover:text-primary"
              )}
            >
              팔로잉
            </Link>
          </div>
        </nav>

        {/* 3단: 카테고리 칩 */}
        <div className="px-4 pb-3 overflow-hidden">
          <StreamCategoryTabs currentCategory={category} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-page-x py-6">
        {isDataEmpty ? (
          <StreamEmptyState
            keyword={keyword}
            category={category}
            scope={scope}
          />
        ) : (
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense
              fallback={
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                </div>
              }
            >
              <StreamListSection
                key={JSON.stringify(searchParams)}
                scope={scope}
                searchParams={queryParams}
                viewerId={viewerId}
              />
            </Suspense>
          </HydrationBoundary>
        )}
      </div>
      {/* 스트리밍 추가 플로팅 버튼 (FAB) */}
      <AddStreamButton />
    </div>
  );
}
