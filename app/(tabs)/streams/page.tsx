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
 */
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import { cn } from "@/lib/utils";
import { STREAMS_PAGE_TAKE } from "@/lib/constants";
import NotificationBell from "@/components/global/NotificationBell";
import StreamCategoryTabs from "@/features/search/components/StreamCategoryTabs";
import StreamSearchBarWrapper from "@/features/stream/components/StreamSearchBarWrapper";
import StreamEmptyState from "@/features/stream/components/StreamEmptyState";
import AddStreamButton from "@/features/stream/components/AddStreamButton";
import StreamListSection from "@/features/stream/components/StreamListSection";
import LiveStatusRealtimeSubscriber from "@/features/stream/components/LiveStatusRealtimeSubscriber";
import { getStreams } from "@/features/stream/service/list";
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
 * 1. 검색 조건(키워드, 카테고리, 스코프)에 따라 방송 목록을 조회 (`getStreams` Service)
 * 2. `LiveStatusRealtimeSubscriber`를 통해 실시간 상태 갱신을 구독
 * 3. 카테고리 탭과 검색바를 상단에 고정 표시
 * 4. 목록(`StreamListSection`) 또는 빈 상태(`StreamEmptyState`)를 렌더링
 * 5. 우측 하단에 방송 시작 버튼(`AddStreamButton`)을 표시
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

  const TAKE = STREAMS_PAGE_TAKE;

  // Service 직접 호출 (Action Wrapper 제거)
  const [allItems, unreadCount] = await Promise.all([
    getStreams({
      scope,
      category,
      keyword,
      viewerId,
      cursor: null,
      take: TAKE + 1,
    }),
    getUnreadNotificationCount(),
  ]);

  // Cursor 계산
  const hasMore = allItems.length > TAKE;
  const streams = hasMore ? allItems.slice(0, TAKE) : allItems;
  const nextCursor = hasMore ? streams[streams.length - 1].id : null;

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
      {/* 실시간 상태 구독 */}
      <LiveStatusRealtimeSubscriber />

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          {/* Search + Bell Group */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <StreamSearchBarWrapper />
            <div className="shrink-0">
              <NotificationBell userId={viewerId} initialCount={unreadCount} />
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-3 mt-4">
          <StreamCategoryTabs currentCategory={category} />
          {/* Scope Tab */}
          <nav
            aria-label="스트리밍 보기 범위"
            role="tablist"
            className="shrink-0"
          >
            <div className="flex p-1 bg-surface-dim rounded-xl border border-border">
              <Link
                href={buildHref("all")}
                role="tab"
                aria-selected={scope === "all"}
                className={cn(
                  "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                  scope === "all"
                    ? "bg-surface text-brand shadow-sm"
                    : "text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                전체
              </Link>
              <Link
                href={buildHref("following")}
                role="tab"
                aria-selected={scope === "following"}
                className={cn(
                  "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                  scope === "following"
                    ? "bg-surface text-brand shadow-sm"
                    : "text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                팔로잉
              </Link>
            </div>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-page-x py-6">
        {streams.length > 0 ? (
          <StreamListSection
            key={JSON.stringify(searchParams)}
            scope={scope}
            searchParams={{
              category: category ?? "",
              keyword: keyword ?? "",
            }}
            initialItems={streams}
            initialCursor={nextCursor}
            viewerId={viewerId}
          />
        ) : (
          <StreamEmptyState
            keyword={keyword}
            category={category}
            scope={scope}
          />
        )}
      </div>

      <AddStreamButton />
    </div>
  );
}
