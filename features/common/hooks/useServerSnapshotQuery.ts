/**
 * File Name : features/common/hooks/useServerSnapshotQuery.ts
 * Description : 서버 snapshot과 클라이언트 Query cache를 동기화하는 공용 Hook
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   재방문 시 기존 무기한 cache가 새 서버 props를 가리지 않도록 snapshot 우선 동기화
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  hashKey,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

interface UseServerSnapshotQueryOptions<TData> {
  queryKey: QueryKey;
  snapshot: TData;
}

/**
 * 서버에서 새로 받은 snapshot을 상세·개인화 cache의 기준값으로 사용한다.
 *
 * [동기화 전략]
 * - 첫 렌더와 새 snapshot 수신 렌더에서는 기존 cache보다 서버 값을 우선한다.
 * - effect에서 QueryClient에도 같은 값을 기록한 뒤 mutation의 낙관적 cache 갱신을 따른다.
 * - query 자체는 원격 재조회 책임이 없으므로 비활성 상태로 유지한다.
 *
 * @param options.queryKey - 동기화할 TanStack Query key
 * @param options.snapshot - 서버 컴포넌트가 전달한 최신 기준값
 * @returns 서버 snapshot과 동기화된 query data
 */
export function useServerSnapshotQuery<TData>({
  queryKey,
  snapshot,
}: UseServerSnapshotQueryOptions<TData>): TData {
  const queryClient = useQueryClient();
  const synchronizationKey = hashKey([queryKey, snapshot]);
  const latestSnapshotRef = useRef({ queryKey, snapshot });
  const [synchronizedKey, setSynchronizedKey] = useState<string | null>(null);
  latestSnapshotRef.current = { queryKey, snapshot };

  const { data: cachedData } = useQuery<TData>({
    queryKey,
    queryFn: () => latestSnapshotRef.current.snapshot,
    initialData: snapshot,
    staleTime: Infinity,
    enabled: false,
  });

  useEffect(() => {
    const latest = latestSnapshotRef.current;
    queryClient.setQueryData(latest.queryKey, latest.snapshot);
    setSynchronizedKey(synchronizationKey);
  }, [queryClient, synchronizationKey]);

  return synchronizedKey === synchronizationKey && cachedData !== undefined
    ? cachedData
    : snapshot;
}
