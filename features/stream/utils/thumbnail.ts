/**
 * File Name : features/stream/utils/thumbnail.ts
 * Description : 방송 공개 범위에 따른 목록 썸네일 선택
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   제한 VOD의 provider asset URL을 비소유자 목록에서 숨기는 규칙 추가
 */

import type { StreamVisibility } from "@/features/stream/types";

/** PUBLIC 또는 소유자 목록에서만 Cloudflare VOD 썸네일을 사용한다. */
export function selectRecordingThumbnail({
  visibility,
  isOwner,
  providerThumbnail,
  broadcastThumbnail,
  broadcastThumbnailAnimated,
}: {
  visibility: StreamVisibility;
  isOwner: boolean;
  providerThumbnail: string | null | undefined;
  broadcastThumbnail: string | null;
  broadcastThumbnailAnimated?: boolean | null;
}) {
  const canExposeProviderThumbnail = visibility === "PUBLIC" || isOwner;
  const useProviderThumbnail =
    canExposeProviderThumbnail && Boolean(providerThumbnail);

  return {
    thumbnail: useProviderThumbnail
      ? (providerThumbnail ?? null)
      : broadcastThumbnail,
    thumbnailAnimated: useProviderThumbnail
      ? false
      : (broadcastThumbnailAnimated ?? false),
  };
}
