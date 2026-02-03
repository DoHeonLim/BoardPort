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
 */

"use client";

import { formatDuration } from "@/lib/utils";
import TimeAgo from "@/components/ui/TimeAgo";
import { toast } from "sonner";
import {
  ChatBubbleBottomCenterTextIcon,
  EyeIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";

interface RecordingMetaProps {
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
 */
export default function RecordingMeta({
  created,
  duration,
  viewCount = 0,
  commentCount = 0,
  LikeButtonComponent,
}: RecordingMetaProps) {
  const handleCopyLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";

      // 1) Web Share API 우선
      if (url && typeof navigator !== "undefined" && "share" in navigator) {
        await (navigator as any).share({ title: document.title, url });
        return;
      }
      // 2) Clipboard API
      if (url && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("링크가 복사되었습니다.");
        return;
      }
      // 3) 폴백
      toast.error("공유를 지원하지 않는 환경입니다.");
    } catch {
      toast.error("링크 복사에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4">
      {/* 1. 시간 및 공유 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <TimeAgo date={created} />
          <span className="text-border">|</span>
          <span>{formatDuration(duration)}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors p-1.5 -mr-1.5 rounded-lg hover:bg-surface-dim"
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
            <span>{commentCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
