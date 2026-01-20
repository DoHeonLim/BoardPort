/**
 * File Name : app/(tabs)/streams/page
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
 */

import Link from "next/link";
import getSession from "@/lib/session";

import { getInitialStreams } from "./actions/init";
import { searchStreams } from "./actions/search";

import StreamCategoryTabs from "@/features/search/components/StreamCategoryTabs";
import StreamSearchBarWrapper from "@/features/stream/components/StreamSearchBarWrapper";
import StreamEmptyState from "@/features/stream/components/StreamEmptyState";
import AddStreamButton from "@/features/stream/components/AddStreamButton";
import StreamListSection from "@/features/stream/components/StreamListSection";
import LiveStatusRealtimeSubscriber from "@/features/stream/components/LiveStatusRealtimeSubscriber";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic"; // 명시적으로 동적 페이지 선언

interface StreamsPageProps {
  searchParams: {
    keyword?: string;
    category?: string;
    scope?: "all" | "following";
  };
}

export default async function StreamsPage({ searchParams }: StreamsPageProps) {
  const session = await getSession();
  const viewerId = session?.id ?? null;
  // 스코프 정규화
  const scope: "all" | "following" =
    searchParams.scope === "following" ? "following" : "all";
  // 검색/필터/스코프 여부
  const hasSearchParams =
    !!searchParams.keyword || !!searchParams.category || scope !== "all";

  /**
   * 리스트 페이지는 캐시 미사용
   * - 스트리밍 상태/팔로우 상태 등 실시간/개인화 의존도가 높음
   * - Supabase Realtime + router.refresh()로 최신 상태 반영
   */
  const initial = hasSearchParams
    ? await searchStreams({
        scope,
        category: searchParams.category,
        keyword: searchParams.keyword,
        viewerId,
      })
    : await getInitialStreams({
        scope: "all",
        category: undefined,
        keyword: undefined,
        viewerId,
      });

  // 탭 링크 빌더(기존 파라미터 유지)
  const buildHref = (nextScope: "all" | "following") => {
    const sp = new URLSearchParams();
    if (searchParams.category) sp.set("category", searchParams.category);
    if (searchParams.keyword) sp.set("keyword", searchParams.keyword);
    if (nextScope !== "all") sp.set("scope", nextScope);
    const q = sp.toString();
    return q ? `/streams?${q}` : `/streams`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors pb-24">
      <LiveStatusRealtimeSubscriber />

      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4 shadow-sm">
        <StreamCategoryTabs currentCategory={searchParams.category} />

        <div className="mt-4 flex items-center justify-between gap-4">
          <StreamSearchBarWrapper />

          {/* Scope Tab (Segmented Control) */}
          <nav aria-label="스트리밍 보기 범위" role="tablist">
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

      <div className="flex-1 px-page-x py-6">
        {initial.streams.length > 0 ? (
          <StreamListSection
            key={JSON.stringify(searchParams)}
            scope={scope}
            searchParams={{
              category: searchParams.category ?? "",
              keyword: searchParams.keyword ?? "",
            }}
            initialItems={initial.streams}
            initialCursor={initial.nextCursor}
            viewerId={viewerId}
          />
        ) : (
          <StreamEmptyState
            keyword={searchParams.keyword}
            category={searchParams.category}
            scope={scope}
          />
        )}
      </div>

      <AddStreamButton />
    </div>
  );
}
