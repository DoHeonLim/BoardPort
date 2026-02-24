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
import type { FollowListUser, FollowListCursor } from "@/features/user/types";

type Fetcher = (
  username: string,
  cursor: FollowListCursor
) => Promise<{ users: FollowListUser[]; nextCursor: FollowListCursor }>;

interface useFollowPaginationParams {
  username: string;
  fetcher: Fetcher;
}

type FollowPaginationError =
  | { stage: "first"; message: string }
  | { stage: "more"; message: string };

/**
 * 팔로워/팔로잉 목록 페이지네이션 훅
 *
 * [기능]
 * 1. 키셋 커서(Keyset Cursor) 기반의 무한 스크롤 상태를 관리.
 * 2. `dedupMerge` 로직을 통해 중복 데이터를 제거하며 리스트를 병합
 * 3. 초기 로딩(`loadFirst`)과 추가 로딩(`loadMore`)을 분리하여 에러 핸들링을 세분화
 * 4. `upsertLocal` 및 `removeLocal` 메서드를 제공하여, 서버 재요청 없이 리스트 아이템을 즉시 갱신할 수 있음
 *
 * @param {useFollowPaginationParams} params - 데이터 Fetcher 함수 및 유저명
 */
export function useFollowPagination({
  username,
  fetcher,
}: useFollowPaginationParams) {
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [cursor, setCursor] = useState<FollowListCursor>(null);
  const [loaded, setLoaded] = useState(false); // 초기 로딩 완료 여부
  const [loading, setLoading] = useState(false); // 현재 로딩 중 여부
  const [error, setError] = useState<FollowPaginationError | null>(null);

  // 중복 제거 병합 헬퍼
  const dedupMerge = useCallback(
    (prev: FollowListUser[], incoming: FollowListUser[]) => {
      const map = new Map(prev.map((u) => [u.id, u]));
      for (const u of incoming) map.set(u.id, u);
      // Map은 삽입 순서를 유지하므로, 기존 순서 + 신규 순서가 됨 (단, 기존 키는 위치 유지)
      return Array.from(map.values());
    },
    []
  );

  /**
   * 초기 목록 로딩 (모달 열릴 때 1회)
   */
  const loadFirst = useCallback(async () => {
    if (loaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetcher(username, null);
      setUsers(res.users);
      setCursor(res.nextCursor);
      setLoaded(true);
    } catch (e) {
      console.error("[follow] loadFirst failed:", e);
      setError({
        stage: "first",
        message: "목록을 불러오지 못했습니다. 다시 시도해주세요.",
      });
      // 에러 시 상태 초기화
      setUsers([]);
      setCursor(null);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [fetcher, username, loaded, loading]);

  /**
   * 추가 목록 로딩 (무한 스크롤)
   */
  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetcher(username, cursor);
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
  }, [cursor, dedupMerge, fetcher, loading, username]);

  /**
   * 로컬 상태 업데이트 (Optimistic UI용)
   * - 팔로우 토글 시 리스트 내 아이템 상태만 변경할 때 사용
   */
  const upsertLocal = useCallback((user: FollowListUser) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx === -1) return [...prev, user]; // 없으면 추가
      const next = prev.slice();
      next[idx] = user; // 있으면 교체
      return next;
    });
  }, []);

  const removeLocal = useCallback((id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // 에러 재시도
  const retry = useCallback(async () => {
    if (!error) return;
    if (error.stage === "first") return loadFirst();
    return loadMore();
  }, [error, loadFirst, loadMore]);

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
    retry,
  };
}
