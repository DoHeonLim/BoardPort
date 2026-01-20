/**
 * File Name : features/stream/components/StreamList.tsx
 * Description : 스트리밍 카드 리스트 + 자체 무한스크롤 상태 (URL 탭 구조 호환)
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   StreamCard 호환 + 내부 페이지네이션 내장
 * 2025.08.26  임도헌   Modified  usePageVisibility + 새 useInfiniteScroll 옵션 추가
 * 2025.09.10  임도헌   Modified  append 중복 방지(Map), 에러 메시지/aria 보강, 사소한 정리
 * 2025.09.17  임도헌   Modified  StreamCardItem 필드(startedAt/isLive) 정합화, append 병합 정리
 * 2025.09.17  임도헌   Modified  BroadcastSummary로 변경
 * 2026.01.03  임도헌   Modified  병합 로직 O(n²) 제거(Map 기반 O(n+m)으로 최적화)
 * 2026.01.04  임도헌   Modified  팔로우 즉시 반영: followDelta 구독으로 FOLLOWERS 잠금 카드 즉시 갱신
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 레이아웃 개선
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { getMoreStreams } from "@/app/(tabs)/streams/actions/init";
import { onFollowDelta } from "@/features/user/lib/follow/followDeltaClient";
import StreamCard from "@/features/stream/components/StreamCard";
import type { BroadcastSummary } from "@/types/stream";

type Scope = "all" | "following";

interface StreamListProps {
  scope: Scope;
  searchParams: { category?: string; keyword?: string };
  initialItems: BroadcastSummary[];
  initialCursor: number | null;
  onRequestFollow?: (streamer: { id: number; username: string }) => void;
  viewerId?: number | null;
}

export default function StreamList({
  scope,
  searchParams,
  initialItems,
  initialCursor,
  onRequestFollow,
  viewerId = null,
}: StreamListProps) {
  const [items, setItems] = useState<BroadcastSummary[]>(initialItems);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState<boolean>(initialCursor !== null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 검색 파라미터/초기값 변경 시 리스트 상태 리셋
   * - page.tsx에서 key={JSON.stringify(searchParams)}로 리마운트를 유도하고 있지만,
   *   혹시나 재사용되는 경우에도 안전하게 동작하도록 방어적으로 유지한다.
   */
  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setHasMore(initialCursor !== null);
    setError(null);
  }, [initialItems, initialCursor]);

  /**
   * 팔로우 즉시 반영(리스트):
   * - FollowSection이 아닌 곳에서는 followersOnlyLocked가 서버 플래그로만 남기 쉬움.
   * - 같은 탭에서 내가 팔로우/언팔한 결과를 followDelta로 구독해
   *   해당 스트리머의 FOLLOWERS 방송 카드 잠금을 즉시 갱신한다.
   */
  useEffect(() => {
    if (!viewerId) return;

    return onFollowDelta((d) => {
      // 내 액션만 반영(다른 사용자의 이벤트/테스트 노이즈 방지)
      if ((d.viewerId ?? null) !== viewerId) return;

      const serverIsFollowing = d.server?.isFollowing;
      if (typeof serverIsFollowing !== "boolean") return;

      const targetUserId = d.targetUserId;

      setItems((prev) => {
        let changed = false;

        const next = prev.map((s) => {
          if (s.user.id !== targetUserId) return s;
          if (s.visibility !== "FOLLOWERS") return s;

          const nextLocked = !serverIsFollowing;
          if (!!s.followersOnlyLocked === nextLocked) return s;

          changed = true;
          return { ...s, followersOnlyLocked: nextLocked };
        });

        return changed ? next : prev;
      });
    });
  }, [viewerId]);

  const triggerRef = useRef<HTMLDivElement>(null);
  const isVisible = usePageVisibility();

  // 빈 문자열 방지(서버 액션에서 또 한번 정규화하지만 여기서도 가볍게)
  const category = (searchParams.category || "").trim();
  const keyword = (searchParams.keyword || "").trim();

  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading,
    onLoadMore: async () => {
      if (isLoading || !hasMore) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getMoreStreams(
          scope,
          cursor,
          { category, keyword },
          viewerId
        );

        /**
         * 병합 정책(성능 최적화)
         * - 기존 순서 유지
         * - 동일 id는 “신규 데이터”로 덮어써 최신 상태 반영
         * - prev에 없던 신규만 뒤에 추가
         * - O(n²) find 제거 → O(n+m)
         */
        if (data.streams.length > 0) {
          setItems((prev) => {
            const byId = new Map<number, BroadcastSummary>();

            // 1) prev로 기본 상태 확보(순서/기존 값)
            for (const item of prev) byId.set(item.id, item);

            // 2) 신규 데이터로 덮어쓰기(같은 id면 최신 상태)
            for (const item of data.streams) byId.set(item.id, item);

            // 3) 결과 배열: 기존 순서 유지 + 최신 값 반영
            const next: BroadcastSummary[] = [];
            for (const item of prev) {
              const latest = byId.get(item.id);
              if (latest) next.push(latest);
              byId.delete(item.id); // 남는 건 “prev에 없던 신규”만 남김
            }

            // 4) prev에 없던 신규만 뒤에 추가
            for (const item of data.streams) {
              if (byId.has(item.id)) {
                next.push(item);
                byId.delete(item.id);
              }
            }

            return next;
          });
        }

        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      } catch (e) {
        console.error("Failed to load more streams:", e);
        setError("목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setIsLoading(false);
      }
    },
    enabled: isVisible,
    rootMargin: "1200px 0px 0px 0px",
    threshold: 0.01,
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {items.map((s) => {
          const tags =
            Array.isArray(s.tags) && s.tags.length > 0
              ? typeof (s.tags as any)[0] === "string"
                ? (s.tags as any).map((name: string) => ({ name }))
                : s.tags
              : [];

          return (
            <StreamCard
              key={s.id}
              id={s.id}
              title={s.title}
              thumbnail={s.thumbnail ?? null}
              isLive={s.status === "CONNECTED"}
              streamer={{
                username: s.user.username,
                avatar: s.user.avatar ?? null,
              }}
              startedAt={s.started_at}
              category={s.category}
              tags={tags as { name: string }[]}
              requiresPassword={s.requiresPassword}
              isFollowersOnly={s.visibility === "FOLLOWERS"}
              followersOnlyLocked={s.followersOnlyLocked}
              onRequestFollow={
                onRequestFollow
                  ? () =>
                      onRequestFollow({
                        id: s.user.id,
                        username: s.user.username,
                      })
                  : undefined
              }
              layout="grid"
            />
          );
        })}
      </div>

      {isLoading && (
        <div
          className="py-12 flex justify-center items-center gap-2 text-sm text-muted"
          role="status"
          aria-live="polite"
        >
          <span className="size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span>방송을 불러오는 중...</span>
        </div>
      )}

      {error && (
        <div className="py-6 text-center text-sm text-danger bg-danger/5 rounded-lg border border-danger/10 mx-4">
          {error}
        </div>
      )}

      <div ref={triggerRef} className="h-8" aria-hidden="true" tabIndex={-1} />
    </>
  );
}
