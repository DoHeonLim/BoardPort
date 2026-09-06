/**
 * File Name : features/stream/utils/recordingListCache.test.ts
 * Description : 녹화본 목록 캐시 조회자 범위 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   좋아요 캐시 격리 및 공개 카운트 호환성 테스트 추가
 */

import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { RecordingsPage } from "@/features/stream/types";
import {
  getRecordingListSnapshots,
  invalidateRecordingListCaches,
  isChannelRecordingsKey,
  isRecordingListKey,
  updateRecordingListCaches,
} from "@/features/stream/utils/recordingListCache";
import { queryKeys } from "@/lib/queryKeys";

function createRecordingCache(
  isLiked: boolean,
  likeCount: number,
  commentCount: number
): InfiniteData<RecordingsPage> {
  return {
    pages: [
      {
        recordings: [
          {
            vodId: 10,
            broadcastId: 100,
            title: "테스트 녹화본",
            thumbnail: null,
            visibility: "PUBLIC",
            user: { id: 1, username: "owner" },
            readyAt: null,
            isLiked,
            likeCount,
            commentCount,
          },
        ],
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  };
}

function getRecording(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
) {
  return queryClient.getQueryData<InfiniteData<RecordingsPage>>(queryKey)
    ?.pages[0].recordings[0];
}

describe("recording list personalized cache scope", () => {
  it("메인/채널 다시보기 키를 현재 조회자 기준으로 판별한다", () => {
    const mainViewerOne = queryKeys.streams.recordingList("latest", {}, 1);
    const mainViewerTwo = queryKeys.streams.recordingList("latest", {}, 2);
    const channelViewerOne = queryKeys.streams.channelRecordings(7, 1);
    const channelViewerTwo = queryKeys.streams.channelRecordings(7, 2);

    expect(isRecordingListKey(mainViewerOne, 1)).toBe(true);
    expect(isRecordingListKey(mainViewerTwo, 1)).toBe(false);
    expect(isChannelRecordingsKey(channelViewerOne, 1)).toBe(true);
    expect(isChannelRecordingsKey(channelViewerTwo, 1)).toBe(false);
    expect(isChannelRecordingsKey(["streams", "channelRecordings"])).toBe(
      true
    );
  });

  it("좋아요 업데이트와 스냅샷은 현재 조회자 캐시에만 적용한다", () => {
    const queryClient = new QueryClient();
    const viewerOneMain = queryKeys.streams.recordingList("latest", {}, 1);
    const viewerTwoMain = queryKeys.streams.recordingList("latest", {}, 2);
    const viewerOneChannel = queryKeys.streams.channelRecordings(7, 1);
    const viewerTwoChannel = queryKeys.streams.channelRecordings(7, 2);

    queryClient.setQueryData(viewerOneMain, createRecordingCache(false, 3, 1));
    queryClient.setQueryData(viewerTwoMain, createRecordingCache(false, 3, 1));
    queryClient.setQueryData(
      viewerOneChannel,
      createRecordingCache(false, 3, 1)
    );
    queryClient.setQueryData(
      viewerTwoChannel,
      createRecordingCache(false, 3, 1)
    );

    const snapshots = getRecordingListSnapshots(queryClient, 1);
    updateRecordingListCaches(
      queryClient,
      10,
      () => ({ isLiked: true, likeCount: 4 }),
      1
    );

    expect(snapshots.recordingLists).toHaveLength(1);
    expect(snapshots.channelRecordings).toHaveLength(1);
    expect(getRecording(queryClient, viewerOneMain)).toMatchObject({
      isLiked: true,
      likeCount: 4,
    });
    expect(getRecording(queryClient, viewerOneChannel)).toMatchObject({
      isLiked: true,
      likeCount: 4,
    });
    expect(getRecording(queryClient, viewerTwoMain)).toMatchObject({
      isLiked: false,
      likeCount: 3,
    });
    expect(getRecording(queryClient, viewerTwoChannel)).toMatchObject({
      isLiked: false,
      likeCount: 3,
    });
  });

  it("viewerId를 생략한 공개 댓글 수 갱신은 기존처럼 모든 목록에 적용한다", () => {
    const queryClient = new QueryClient();
    const viewerOne = queryKeys.streams.recordingList("latest", {}, 1);
    const viewerTwo = queryKeys.streams.recordingList("latest", {}, 2);

    queryClient.setQueryData(viewerOne, createRecordingCache(false, 3, 1));
    queryClient.setQueryData(viewerTwo, createRecordingCache(true, 3, 1));

    updateRecordingListCaches(queryClient, 10, (recording) => ({
      commentCount: (recording.commentCount ?? 0) + 1,
    }));

    expect(getRecording(queryClient, viewerOne)?.commentCount).toBe(2);
    expect(getRecording(queryClient, viewerTwo)?.commentCount).toBe(2);
  });

  it("무효화도 현재 조회자 목록에만 적용한다", () => {
    const queryClient = new QueryClient();
    const viewerOne = queryKeys.streams.recordingList("latest", {}, 1);
    const viewerTwo = queryKeys.streams.recordingList("latest", {}, 2);

    queryClient.setQueryData(viewerOne, createRecordingCache(false, 3, 1));
    queryClient.setQueryData(viewerTwo, createRecordingCache(true, 3, 1));

    invalidateRecordingListCaches(queryClient, 1);

    expect(
      queryClient.getQueryCache().find({ queryKey: viewerOne, exact: true })
        ?.state.isInvalidated
    ).toBe(true);
    expect(
      queryClient.getQueryCache().find({ queryKey: viewerTwo, exact: true })
        ?.state.isInvalidated
    ).toBe(false);
  });
});
