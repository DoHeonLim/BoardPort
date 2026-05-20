/**
 * File Name : features/stream/utils/recordingListCache.ts
 * Description : 녹화본 상세 상호작용 후 다시보기 목록 캐시를 동기화하는 클라이언트 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.18  임도헌   Created   녹화본 좋아요/댓글 변경 시 메인/채널 다시보기 목록 캐시 갱신 유틸 추가
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

/**
 * 채널 다시보기 목록 query key 여부 확인
 *
 * @param queryKey - TanStack Query key
 * @returns 채널 다시보기 목록 캐시이면 true
 */
export function isChannelRecordingsKey(queryKey: QueryKey) {
  return queryKey[0] === "streams" && queryKey[1] === "channelRecordings";
}

/**
 * 다시보기 메인/채널 목록 query 취소
 *
 * @param queryClient - TanStack Query Client
 */
export async function cancelRecordingListQueries(queryClient: QueryClient) {
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
  queryClient: QueryClient
): RecordingListSnapshots {
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
  patcher: (recording: VodForGrid) => Partial<VodForGrid>
) {
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
 * 다시보기 메인/채널 목록 캐시 무효화
 *
 * @param queryClient - TanStack Query Client
 */
export function invalidateRecordingListCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.streams.recordingLists(),
  });
  queryClient.invalidateQueries({
    predicate: (query) => isChannelRecordingsKey(query.queryKey),
  });
}
