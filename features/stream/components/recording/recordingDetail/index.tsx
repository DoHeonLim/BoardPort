/**
 * File Name : features/stream/components/recording/recordingDetail/index.tsx
 * Description : 스트리밍 녹화본 상세 정보 통합 컴포넌트 (VodAsset 단위 상호작용)
 * Author : 임도헌
 *
 * History
 * 2025.08.06  임도헌   Created   녹화본 상세정보 컴포넌트 통합
 * 2025.09.20  임도헌   Modified  VodAsset 단위 좋아요/댓글/조회수 설계 반영
 * 2025.09.22  임도헌   Modified  RecordingDetailStream 제거 → getVodDetail DTO에 정렬
 * 2025.11.26  임도헌   Modified  RecordingHeader → RecordingTitle, 작성자 정보는 Topbar로 이동
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 레이아웃 정리
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * ===============================================================================================
 * RecordingDetail (녹화본 상세) 정보를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * - RecordingTitle.tsx      : 녹화본 제목
 * - RecordingVideo.tsx      : 녹화 영상 플레이어 (Cloudflare Iframe)
 * - RecordingMeta.tsx       : 조회수, 좋아요, 작성일, 공유 버튼 등 메타 정보
 * - RecordingLikeButton.tsx : 좋아요 버튼 (Optimistic UI)
 * - RecordingDeleteButton.tsx : 삭제 버튼 (소유자 전용)
 * - index.tsx               : 위 컴포넌트들을 조합한 최종 컨테이너
 * ===============================================================================================
 */

"use client";

import RecordingTitle from "@/features/stream/components/recording/recordingDetail/RecordingTitle";
import RecordingVideo from "@/features/stream/components/recording/recordingDetail/RecordingVideo";
import RecordingMeta from "@/features/stream/components/recording/recordingDetail/RecordingMeta";
import RecordingLikeButton from "@/features/stream/components/recording/recordingDetail/RecordingLikeButton";

interface RecordingDetailProps {
  /** 방송 메타: 제목 + 소유자 */
  broadcast: { title: string };

  /** VodAsset 식별/표시용 */
  vodId: number; // 좋아요/댓글/조회수는 VodAsset 기준
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
      <RecordingTitle title={broadcast.title} />
      <RecordingVideo uid={uid} />
      <RecordingMeta
        title={broadcast.title}
        created={created}
        duration={duration}
        viewCount={viewCount}
        commentCount={commentCount} // VodAsset 기준 댓글 수
        LikeButtonComponent={
          <RecordingLikeButton
            vodId={vodId} // streamId → vodId 로 전환
            isLiked={isLiked}
            likeCount={likeCount}
          />
        }
      />
    </div>
  );
}
