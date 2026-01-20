/**
 * File Name : features/stream/components/recording/recordingDetail/RecordingLikeButton.tsx
 * Description : 스트리밍 녹화본(VodAsset) 좋아요 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.07  임도헌   Created   post 방식 기반 녹화본 좋아요 버튼 컴포넌트 구현
 * 2025.09.10  임도헌   Modified  useOptimistic 제거 → 로컬 상태 + 낙관 업데이트
 * 2025.09.20  임도헌   Modified  VodAsset 단위로 전환(streamId → vodId)
 * 2026.01.14  임도헌   Modified  [UI] PostLikeButton과 스타일 통일
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useEffect, useState, useTransition } from "react";
import {
  likeRecording,
  dislikeRecording,
} from "@/app/streams/[id]/recording/actions/likes";
import { HeartIcon } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecordingLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  vodId: number;
}

export default function RecordingLikeButton({
  isLiked,
  likeCount,
  vodId,
}: RecordingLikeButtonProps) {
  const [local, setLocal] = useState({ isLiked, likeCount });

  useEffect(() => {
    setLocal({ isLiked, likeCount });
  }, [isLiked, likeCount]);

  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (isPending) return;

    const prev = local;
    const optimistic = {
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
    };

    setLocal(optimistic);

    startTransition(async () => {
      try {
        const res = optimistic.isLiked
          ? await likeRecording(vodId)
          : await dislikeRecording(vodId);

        if (res && "success" in res) {
          if (res.success) {
            // 서버 응답으로 동기화 (필요시)
            setLocal({ isLiked: res.isLiked, likeCount: res.likeCount });
            toast.success(
              optimistic.isLiked ? "좋아요를 눌렀습니다." : "좋아요 취소"
            );
          } else {
            setLocal(prev); // Rollback
            toast.error("오류가 발생했습니다.");
          }
        }
      } catch {
        setLocal(prev); // Rollback
        toast.error("오류가 발생했습니다.");
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 p-1.5 -ml-1.5 rounded-lg transition-colors hover:bg-surface-dim",
        local.isLiked ? "text-rose-500" : "text-muted hover:text-rose-500",
        isPending && "opacity-70 cursor-not-allowed"
      )}
      aria-label={local.isLiked ? "좋아요 취소" : "좋아요"}
      aria-pressed={local.isLiked}
    >
      {local.isLiked ? (
        <HeartIcon className="size-6" />
      ) : (
        <OutlineHeartIcon className="size-6" />
      )}
      <span className="text-sm font-medium">{local.likeCount}</span>
    </button>
  );
}
