/**
 * File Name : features/stream/components/recording/recordingDetail/index.tsx
 * Description : 스트리밍 녹화본 상세 정보 통합 컴포넌트 (VodAsset 단위 상호작용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.06  임도헌   Created   녹화본 상세정보 컴포넌트 통합
 * 2025.09.20  임도헌   Modified  VodAsset 단위 좋아요/댓글/조회수 설계 반영
 * 2025.09.22  임도헌   Modified  RecordingDetailStream 제거 → getVodDetail DTO에 정렬
 * 2025.11.26  임도헌   Modified  RecordingHeader → RecordingTitle, 작성자 정보는 Topbar로 이동
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 레이아웃 정리
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.17  임도헌   Modified  녹화 상세 메타 패널과 영상 영역 간 간격을 조정해 최신 상세 톤에 맞게 정리
 * 2026.03.19  임도헌   Modified  녹화 상세 영상/메타 패널 외곽선을 border-border-subtle 기준으로 맞춰 채널 카드 톤과 통일
 * 2026.05.03  임도헌   Modified  녹화 상세에 부모 방송과 연결된 보드게임 카탈로그 칩 노출
 * 2026.05.05  임도헌   Modified  방송 상세과 같은 보드게임 카드형 표시로 통일
 * 2026.05.12  임도헌   Modified  녹화 상세 본문에 방송 카테고리/태그 노출 추가
 * 2026.05.18  임도헌   Modified  RecordingMeta가 VodAsset 기준 댓글 수 캐시를 갱신할 수 있도록 vodId 전달
 * 2026.06.07  임도헌   Modified  녹화본 좋아요 상태를 시청자별 캐시로 분리하기 위해 viewerId 전달
 * ===============================================================================================
 * RecordingDetail (녹화본 상세) 정보를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * - RecordingTitle.tsx      : 녹화본 제목
 * - RecordingVideo.tsx      : 녹화 영상 플레이어 (Cloudflare Iframe)
 * - RecordingMeta.tsx       : 조회수, 좋아요, 작성일, 공유 버튼 등 메타 정보
 * - RecordingLikeButton.tsx : 좋아요 버튼 (Optimistic UI)
 * - RecordingTopbar.tsx       : 상단 액션바(공유/옵션/소유자 삭제 메뉴)
 * - index.tsx               : 위 컴포넌트들을 조합한 최종 컨테이너
 * ===============================================================================================
 */

"use client";

import RecordingTitle from "@/features/stream/components/recording/recordingDetail/RecordingTitle";
import RecordingVideo from "@/features/stream/components/recording/recordingDetail/RecordingVideo";
import RecordingMeta from "@/features/stream/components/recording/recordingDetail/RecordingMeta";
import RecordingLikeButton from "@/features/stream/components/recording/recordingDetail/RecordingLikeButton";
import LinkedBoardGameChips from "@/features/boardgame/components/LinkedBoardGameChips";
import StreamCategoryTags from "@/features/stream/components/StreamDetail/StreamCategoryTags";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";
import type { StreamCategory, StreamTag } from "@/features/stream/types";

interface RecordingDetailProps {
  /** 방송 메타: 제목 + 소유자 */
  broadcast: {
    title: string;
    category?: StreamCategory | null;
    tags?: StreamTag[] | null;
    board_games?: Array<{ boardGame: BoardGameRelationOption }>;
  };

  /** VodAsset 식별/표시용 */
  vodId: number; // 좋아요/댓글/조회수는 VodAsset 기준
  viewerId: number;
  uid: string; // VodAsset.provider_asset_id
  duration: number;
  created: Date;

  /** 상호작용 상태 */
  isLiked: boolean;
  likeCount: number;

  /** 표시용 카운트 */
  commentCount?: number;
  viewCount?: number;
}

/**
 * 녹화본 상세 정보 컨테이너
 *
 * [구조]
 * 1. 제목 (Title)
 * 2. 영상 플레이어 (Video)
 * 3. 메타 정보 및 좋아요/공유 버튼 (Meta)
 */
export default function RecordingDetail({
  broadcast,
  vodId,
  viewerId,
  uid,
  duration,
  created,
  isLiked,
  likeCount,
  commentCount = 0,
  viewCount = 0,
}: RecordingDetailProps) {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-2 px-1">
        <RecordingTitle title={broadcast.title} />
        <StreamCategoryTags
          category={broadcast.category ?? undefined}
          tags={broadcast.tags ?? undefined}
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
        <RecordingVideo uid={uid} />
      </div>
      <div className="rounded-2xl border border-border-subtle bg-surface px-4 py-4 shadow-sm sm:px-5">
        <RecordingMeta
          vodId={vodId}
          title={broadcast.title}
          created={created}
          duration={duration}
          viewCount={viewCount}
          commentCount={commentCount} // VodAsset 기준 댓글 수
          LikeButtonComponent={
            <RecordingLikeButton
              vodId={vodId} // streamId → vodId 로 전환
              viewerId={viewerId}
              isLiked={isLiked}
              likeCount={likeCount}
            />
          }
        />
      </div>
      <LinkedBoardGameChips
        items={broadcast.board_games?.map(({ boardGame }) => boardGame) ?? []}
        title="방송에서 다루는 보드게임"
        variant="cards"
      />
    </div>
  );
}
