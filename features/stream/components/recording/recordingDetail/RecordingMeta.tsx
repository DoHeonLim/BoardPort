/**
 * File Name : features/stream/components/recording/recordingDetail/RecordingMeta.tsx
 * Description : 스트리밍 녹화 상세 - 날짜, 길이, 좋아요, 조회수, 댓글, 공유 정보
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.06  임도헌   Created   녹화 상세 메타 정보 표시 컴포넌트 생성
 * 2025.09.10  임도헌   Modified  TimeAgo에 Date 직접 전달, 공유 핸들러 보강, a11y/가독성 개선
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 아이콘 스타일 통일
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.02.13  임도헌   Modified  handleCopyLink 제거 및 handleShare 통합
 * 2026.03.21  임도헌   Modified  녹화 메타 하단 구분선을 제거해 통계 행과 댓글 섹션 사이 시각적 중복을 정리
 * 2026.05.18  임도헌   Modified  댓글 작성/삭제 후 상세 메타 댓글 수가 즉시 반영되도록 recordingStats 캐시 연동
 * 2026.05.18  임도헌   Modified  상세 통계 아이콘을 다시보기 카드와 같은 solid 문법으로 통일
 */

"use client";

import TimeAgo from "@/components/ui/TimeAgo";
import { ShareIcon } from "@heroicons/react/24/outline";
import {
  ChatBubbleBottomCenterTextIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { formatDuration, handleShare } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface RecordingMetaProps {
  vodId: number;
  title: string;
  created: Date;
  duration: number;
  viewCount?: number;
  commentCount?: number;
  LikeButtonComponent?: React.ReactNode;
}

/**
 * 녹화본 메타 정보 영역
 * - 상단: 작성일, 영상 길이, 공유 버튼
 * - 하단: 좋아요 버튼(주입됨), 조회수, 댓글 수
 * - 댓글 수는 상세 댓글 mutation에서 갱신하는 recordingStats 캐시를 기준으로 표시
 */
export default function RecordingMeta({
  vodId,
  title,
  created,
  duration,
  viewCount = 0,
  commentCount = 0,
  LikeButtonComponent,
}: RecordingMetaProps) {
  const { data: stats } = useQuery({
    queryKey: queryKeys.streams.recordingStats(vodId),
    initialData: { commentCount },
    staleTime: Infinity,
    enabled: false,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* 1. 시간 및 공유 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <TimeAgo date={created} />
          <span className="text-border">|</span>
          <span>{formatDuration(duration)}</span>
        </div>
        <button
          type="button"
          onClick={() => handleShare(`보드포트 다시보기: ${title}`)}
          className="focus-ring-soft -mr-1.5 flex items-center gap-1.5 rounded-lg p-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          aria-label="링크 공유"
        >
          <ShareIcon className="size-4" />
          <span>공유</span>
        </button>
      </div>

      {/* 2. 통계 및 좋아요 */}
      <div className="flex items-center justify-between">
        {LikeButtonComponent}

        <div className="flex items-center gap-4 text-xs text-muted">
          <div className="flex items-center gap-1">
            <EyeIcon className="size-4" />
            <span>{viewCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <ChatBubbleBottomCenterTextIcon className="size-4" />
            <span>{stats.commentCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
