/**
 * File Name : features/user/hooks/useFollowPagination.ts
 * Description : 팔로워/팔로잉 공용 페이지네이션 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.12  임도헌   Created    followers/following 공용화 + 키셋 커서 + 중복 제거
 * 2025.10.29  임도헌   Modified   loadFirst/loadMore try-finally 도입, 실패 시 상태 복구 보강
 * 2025.11.22  임도헌   Modified   onSeedOrMerge 옵션 제거(viewerFollowingSet 의존성 완전 제거)
 * 2025.12.20  임도헌   Modified   upsertLocal 신규 유저는 append(정렬/스크롤 안정성 우선)
 * 2025.12.23  임도헌   Modified   error 상태 추가(초기 로딩 실패 UX 개선) + 재시도 지원
 * 2025.12.23  임도헌   Modified   error stage(first/more) 구분 + retry() 제공(무한스크롤 루프 방지)
 * 2026.01.16  임도헌   Moved     hooks -> hooks/user
 * 2026.01.18  임도헌   Moved     hooks/user -> features/user/hooks
 */

"use client";

import { useCallback, useState } from "react";
import type { FollowListUser, FollowListCursor } from "@/types/profile";

/** 서버 fetch 함수 시그니처 타입 */
type Fetcher = (
  username: string,
  opts: { cursor?: FollowListCursor; limit?: number }
) => Promise<{ users: FollowListUser[]; nextCursor: FollowListCursor }>;

interface useFollowPaginationParams {
  username: string;
  fetcher: Fetcher;
  limit?: number; // 기본 20
}

type FollowPaginationError =
  | { stage: "first"; message: string }
  | { stage: "more"; message: string };

/**
 * 팔로워/팔로잉 리스트 공용 훅
 * - 최초 open 시 loadFirst() 1회
 * - loadMore() 시 중복 제거
 * - upsertLocal(): 기존이면 제자리 교체, 신규면 append(뒤에 추가)
 * - error(stage): first/more 구분 → UI에서 재시도/무한스크롤 루프 방지 처리 가능
 */
export function useFollowPagination({
  username,
  fetcher,
  limit = 20,
}: useFollowPaginationParams) {
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [cursor, setCursor] = useState<FollowListCursor>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<FollowPaginationError | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const dedupMerge = useCallback(
    (prev: FollowListUser[], incoming: FollowListUser[]) => {
      const map = new Map(prev.map((u) => [u.id, u]));
      for (const u of incoming) map.set(u.id, u);
      return Array.from(map.values());
    },
    []
  );

  const loadFirst = useCallback(async () => {
    if (loaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetcher(username, { cursor: null, limit });
      setUsers(res.users);
      setCursor(res.nextCursor);
      setLoaded(true);
    } catch (e) {
      console.error("[follow] loadFirst failed:", e);
      setError({
        stage: "first",
        message: "목록을 불러오지 못했습니다. 다시 시도해주세요.",
      });
      setUsers([]);
      setCursor(null);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [fetcher, username, limit, loaded, loading]);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetcher(username, { cursor, limit });
      setUsers((prev) => dedupMerge(prev, res.users));
      setCursor(res.nextCursor);
    } catch (e) {
      console.error("[follow] loadMore failed:", e);
      setError({
        stage: "more",
        message: "더 불러오지 못했습니다. 다시 시도해주세요.",
      });
    } finally {
      setLoading(false);
    }
  }, [cursor, dedupMerge, fetcher, limit, loading, username]);

  /**
   * UI용 재시도
   * - 최초 로딩 실패: loadFirst 재시도
   * - 더보기 실패: loadMore 재시도
   */
  const retry = useCallback(async () => {
    if (!error) return;
    if (error.stage === "first") return loadFirst();
    return loadMore();
  }, [error, loadFirst, loadMore]);

  /**
   * 로컬 upsert
   * - 기존 유저: 현재 위치(index) 유지한 채 객체만 교체
   * - 신규 유저: append(뒤에 추가) → 정렬/스크롤 안정성 우선
   */
  const upsertLocal = useCallback((user: FollowListUser) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx === -1) return [...prev, user];

      const next = prev.slice();
      next[idx] = user;
      return next;
    });
  }, []);

  const removeLocal = useCallback((id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return {
    users,
    cursor,
    loaded,
    loading,
    loadFirst,
    loadMore,
    hasMore: !!cursor,
    upsertLocal,
    removeLocal,

    error,
    clearError,
    retry,
  };
}
