/**
 * File Name : features/post/components/postsDetail/PostDetailVideo.tsx
 * Description : 게시글 상세용 첨부 동영상 플레이어 및 상태 카드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   게시글 첨부 동영상 1차 도입용 Cloudflare Stream iframe 플레이어 추가
 * 2026.03.31  임도헌   Modified  UPLOADING/PROCESSING/FAILED 상태 안내 문구 세분화
 */
"use client";

import type { PostVideo } from "@/features/post/types";
import { FilmIcon, PlayCircleIcon } from "@heroicons/react/24/outline";

interface PostDetailVideoProps {
  video: PostVideo;
}

/**
 * 게시글 첨부 동영상을 재생하거나 처리 상태를 보여준다.
 *
 * @param {PostDetailVideoProps} props - 게시글 동영상 메타
 * @returns {JSX.Element | null} READY 상태의 iframe 또는 처리 상태 카드
 */
export default function PostDetailVideo({ video }: PostDetailVideoProps) {
  const domain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN;
  const uid = video.providerAssetId ?? video.uploadUid;

  if (video.status === "READY" && domain && uid) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border-subtle bg-black shadow-sm">
        <iframe
          key={uid}
          src={`${domain}/${uid}/iframe`}
          title={`Post video player • ${uid}`}
          loading="lazy"
          className="h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture;"
          allowFullScreen
        />
      </div>
    );
  }

  const isFailed = video.status === "FAILED";
  const isUploading = video.status === "UPLOADING";

  return (
    <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-surface-dim px-6 py-8 text-center shadow-sm">
      <div className="rounded-full bg-brand/10 p-3 text-brand dark:bg-brand-light/10 dark:text-brand-light">
        {isFailed ? (
          <FilmIcon className="size-6" />
        ) : (
          <PlayCircleIcon className="size-6" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary">
          {isFailed
            ? "동영상 처리에 실패했습니다."
            : isUploading
              ? "동영상을 업로드하고 있습니다."
              : "동영상을 준비하고 있습니다."}
        </p>
        <p className="text-xs text-muted">
          {isFailed
            ? "작성 화면에서 다시 업로드하면 새 동영상으로 교체할 수 있습니다."
            : isUploading
              ? "업로드가 완료되면 자동으로 인코딩이 이어지고, 준비가 끝나면 이 자리에서 재생됩니다."
              : "Cloudflare Stream에서 인코딩이 끝나면 이 자리에서 바로 재생됩니다."}
        </p>
      </div>
    </div>
  );
}
