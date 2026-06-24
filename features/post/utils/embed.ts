/**
 * File Name : features/post/utils/embed.ts
 * Description : 게시글 유튜브 임베드 파싱 및 정규화 헬퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.31  임도헌   Created   유튜브 전용 EMBED 블록 파싱과 저장용 메타 정규화 유틸 추가
 */

export interface YouTubeEmbedMeta {
  provider: "YOUTUBE";
  videoId: string;
  originalUrl: string;
  embedUrl: string;
  title: string;
  thumbnailUrl: string;
}

function isValidYouTubeVideoId(videoId: string) {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

function extractVideoIdFromUrl(url: URL): string | null {
  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return isValidYouTubeVideoId(videoId) ? videoId : null;
  }

  if (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "youtube-nocookie.com"
  ) {
    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v") ?? "";
      return isValidYouTubeVideoId(videoId) ? videoId : null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const [type, id] = segments;
    if ((type === "shorts" || type === "embed") && id) {
      return isValidYouTubeVideoId(id) ? id : null;
    }
  }

  return null;
}

/**
 * 유튜브 링크를 게시글 EMBED 블록 저장용 메타로 정규화
 * watch / youtu.be / shorts 링크를 허용하고, 저장 시에는 동일한 embed URL 규격으로 맞춘다.
 */
export function parseYouTubeEmbedInput(
  input?: string | null
): YouTubeEmbedMeta | null {
  const normalizedInput = input?.trim();
  if (!normalizedInput) return null;

  try {
    const url = new URL(normalizedInput);
    const videoId = extractVideoIdFromUrl(url);
    if (!videoId) return null;

    return {
      provider: "YOUTUBE",
      videoId,
      originalUrl: normalizedInput,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      title: "YouTube 영상",
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}
