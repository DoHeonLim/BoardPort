/**
 * File Name : features/stream/utils/recordingListCache.ts
 * Description : 녹화본 상세 상호작용 후 다시보기 목록 캐시를 동기화하는 클라이언트 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.18  임도헌   Created   녹화본 좋아요/댓글 변경 시 메인/채널 다시보기 목록 캐시 갱신 유틸 추가
 * 2026.06.22  임도헌   Modified  녹화 삭제 후 메인/채널 다시보기 목록에서 항목을 즉시 제거하는 유틸 추가
 * 2026.08.13  임도헌   Modified  좋아요용 목록 조작에 조회자 범위 선택 옵션 추가
 * 2026.08.13  임도헌   Modified  댓글 수 낙관 업데이트와 rollback도 현재 조회자 목록으로 제한
 */

import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import type { RecordingsPage, VodForGrid } from "@/features/stream/types";
import { queryKeys } from "@/lib/queryKeys";

type RecordingInfiniteCache = InfiniteData<RecordingsPage>;
type RecordingListSnapshot = Array<[QueryKey, RecordingInfiniteCache | undefined]>;

export interface RecordingListSnapshots {
  recordingLists: RecordingListSnapshot;
  channelRecordings: RecordingListSnapshot;
}

const getViewerScope = (viewerId: number | null) => viewerId ?? "guest";

/** 다시보기 메인 목록 query key 여부 확인 */
export function isRecordingListKey(
  queryKey: QueryKey,
  viewerId?: number | null
) {
  const isRecordingList =
    queryKey[0] === "streams" && queryKey[1] === "recordings";

  if (!isRecordingList || viewerId === undefined) return isRecordingList;
  return queryKey[3] === getViewerScope(viewerId);
}

/**
 * 채널 다시보기 목록 query key 여부 확인
 *
 * @param queryKey - TanStack Query key
 * @returns 채널 다시보기 목록 캐시이면 true
 */
export function isChannelRecordingsKey(
  queryKey: QueryKey,
  viewerId?: number | null
) {
  const isChannelRecordings =
    queryKey[0] === "streams" && queryKey[1] === "channelRecordings";

  if (!isChannelRecordings || viewerId === undefined) {
    return isChannelRecordings;
  }
  return queryKey[3] === getViewerScope(viewerId);
}

/**
 * 다시보기 메인/채널 목록 query 취소
 *
 * @param queryClient - TanStack Query Client
 */
export async function cancelRecordingListQueries(
  queryClient: QueryClient,
  viewerId?: number | null
) {
  if (viewerId !== undefined) {
    await Promise.all([
      queryClient.cancelQueries({
        predicate: (query) => isRecordingListKey(query.queryKey, viewerId),
      }),
      queryClient.cancelQueries({
        predicate: (query) =>
          isChannelRecordingsKey(query.queryKey, viewerId),
      }),
    ]);
    return;
  }

  await Promise.all([
    queryClient.cancelQueries({
      queryKey: queryKeys.streams.recordingLists(),
    }),
    queryClient.cancelQueries({
      predicate: (query) => isChannelRecordingsKey(query.queryKey),
    }),
  ]);
}

/**
 * 다시보기 목록 캐시 스냅샷 저장
 *
 * @param queryClient - TanStack Query Client
 * @returns 낙관적 업데이트 rollback용 목록 캐시 스냅샷
 */
export function getRecordingListSnapshots(
  queryClient: QueryClient,
  viewerId?: number | null
): RecordingListSnapshots {
  if (viewerId !== undefined) {
    return {
      recordingLists: queryClient.getQueriesData<RecordingInfiniteCache>({
        predicate: (query) => isRecordingListKey(query.queryKey, viewerId),
      }),
      channelRecordings: queryClient.getQueriesData<RecordingInfiniteCache>({
        predicate: (query) =>
          isChannelRecordingsKey(query.queryKey, viewerId),
      }),
    };
  }

  return {
    recordingLists: queryClient.getQueriesData<RecordingInfiniteCache>({
      queryKey: queryKeys.streams.recordingLists(),
    }),
    channelRecordings: queryClient.getQueriesData<RecordingInfiniteCache>({
      predicate: (query) => isChannelRecordingsKey(query.queryKey),
    }),
  };
}

/**
 * 다시보기 목록 캐시 스냅샷 복원
 *
 * @param queryClient - TanStack Query Client
 * @param snapshots - rollback에 사용할 이전 목록 캐시
 */
export function restoreRecordingListSnapshots(
  queryClient: QueryClient,
  snapshots?: RecordingListSnapshots
) {
  snapshots?.recordingLists.forEach(([listQueryKey, listData]) => {
    queryClient.setQueryData(listQueryKey, listData);
  });
  snapshots?.channelRecordings.forEach(([listQueryKey, listData]) => {
    queryClient.setQueryData(listQueryKey, listData);
  });
}

/**
 * 다시보기 목록의 특정 녹화본 항목 패치
 *
 * @param oldData - 기존 infinite query 캐시
 * @param vodId - 변경 대상 VOD ID
 * @param patcher - 기존 녹화본을 기준으로 병합할 변경값 생성 함수
 * @returns 패치된 infinite query 캐시
 */
function patchRecordingListCache(
  oldData: RecordingInfiniteCache | undefined,
  vodId: number,
  patcher: (recording: VodForGrid) => Partial<VodForGrid>
) {
  if (!oldData?.pages) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page) => ({
      ...page,
      recordings: page.recordings.map((recording) =>
        recording.vodId === vodId
          ? {
              ...recording,
              ...patcher(recording),
            }
          : recording
      ),
    })),
  };
}

/**
 * 다시보기 메인/채널 목록 캐시 일괄 갱신
 *
 * @param queryClient - TanStack Query Client
 * @param vodId - 변경 대상 VOD ID
 * @param patcher - 기존 녹화본을 기준으로 병합할 변경값 생성 함수
 */
export function updateRecordingListCaches(
  queryClient: QueryClient,
  vodId: number,
  patcher: (recording: VodForGrid) => Partial<VodForGrid>,
  viewerId?: number | null
) {
  if (viewerId !== undefined) {
    queryClient.setQueriesData<RecordingInfiniteCache>(
      {
        predicate: (query) => isRecordingListKey(query.queryKey, viewerId),
      },
      (oldData) => patchRecordingListCache(oldData, vodId, patcher)
    );
    queryClient.setQueriesData<RecordingInfiniteCache>(
      {
        predicate: (query) =>
          isChannelRecordingsKey(query.queryKey, viewerId),
      },
      (oldData) => patchRecordingListCache(oldData, vodId, patcher)
    );
    return;
  }

  queryClient.setQueriesData<RecordingInfiniteCache>(
    { queryKey: queryKeys.streams.recordingLists() },
    (oldData) => patchRecordingListCache(oldData, vodId, patcher)
  );
  queryClient.setQueriesData<RecordingInfiniteCache>(
    { predicate: (query) => isChannelRecordingsKey(query.queryKey) },
    (oldData) => patchRecordingListCache(oldData, vodId, patcher)
  );
}

/**
 * 다시보기 목록의 특정 녹화본 항목 제거
 *
 * @param oldData - 기존 infinite query 캐시
 * @param vodId - 제거 대상 VOD ID
 * @returns 제거된 infinite query 캐시
 */
function removeRecordingFromListCache(
  oldData: RecordingInfiniteCache | undefined,
  vodId: number
) {
  if (!oldData?.pages) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page) => ({
      ...page,
      recordings: page.recordings.filter(
        (recording) => recording.vodId !== vodId
      ),
    })),
  };
}

/**
 * 다시보기 메인/채널 목록 캐시에서 삭제된 녹화본을 즉시 제거
 *
 * @param queryClient - TanStack Query Client
 * @param vodId - 제거 대상 VOD ID
 */
export function removeRecordingFromListCaches(
  queryClient: QueryClient,
  vodId: number
) {
  queryClient.setQueriesData<RecordingInfiniteCache>(
    { queryKey: queryKeys.streams.recordingLists() },
    (oldData) => removeRecordingFromListCache(oldData, vodId)
  );
  queryClient.setQueriesData<RecordingInfiniteCache>(
    { predicate: (query) => isChannelRecordingsKey(query.queryKey) },
    (oldData) => removeRecordingFromListCache(oldData, vodId)
  );
}

/**
 * 다시보기 메인/채널 목록 캐시 무효화
 *
 * @param queryClient - TanStack Query Client
 */
export function invalidateRecordingListCaches(
  queryClient: QueryClient,
  viewerId?: number | null
) {
  if (viewerId !== undefined) {
    queryClient.invalidateQueries({
      predicate: (query) => isRecordingListKey(query.queryKey, viewerId),
    });
    queryClient.invalidateQueries({
      predicate: (query) =>
        isChannelRecordingsKey(query.queryKey, viewerId),
    });
    return;
  }

  queryClient.invalidateQueries({
    queryKey: queryKeys.streams.recordingLists(),
  });
  queryClient.invalidateQueries({
    predicate: (query) => isChannelRecordingsKey(query.queryKey),
  });
}
