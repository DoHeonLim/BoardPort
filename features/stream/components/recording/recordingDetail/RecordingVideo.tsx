/**
 * File Name : features/stream/components/recording/recordingDetail/RecordingVideo.tsx
 * Description : 스트리밍 녹화 상세 - 비디오 표시 (iframe)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.06  임도헌   Created   녹화 영상 iframe 컴포넌트 분리
 * 2025.09.03  임도헌   Modified  iframe title/lazy 및 레이아웃 래퍼 추가
 * 2025.09.10  임도헌   Modified  환경변수 가드/폴백, uid 변경시 리마운트, allow 속성 정리
 * 2026.01.14  임도헌   Modified  [UI] 라운딩 및 배경색 조정
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { cn } from "@/lib/utils";

interface RecordingVideoProps {
  uid: string;
}

/**
 * 녹화 영상을 재생하는 iframe 플레이어
 * - Cloudflare Stream URL을 사용하여 영상을 로드합니다.
 * - 환경 변수가 설정되지 않았거나 UID가 없는 경우 안내 메시지를 표시합니다.
 */
export default function RecordingVideo({ uid }: RecordingVideoProps) {
  const domain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN;

  // 환경변수 누락 가드 (빌드/환경 오설정 대비)
  if (!domain) {
    return (
      <div className="flex justify-center w-full">
        <div className="w-full aspect-video rounded-xl bg-surface-dim grid place-items-center border border-border">
          <p className="text-sm text-muted">동영상을 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const src = `${domain}/${uid}/iframe`;

  return (
    <div className="flex justify-center w-full">
      <div
        className={cn(
          "w-full aspect-video rounded-xl overflow-hidden shadow-sm",
          "bg-black"
        )}
      >
        <iframe
          key={uid} // uid 변경 시 리마운트 보장
          src={src}
          title={`Recording player • ${uid}`}
          loading="lazy"
          className="w-full h-full"
          // 표준 허용 목록 정리 (세미콜론 끝 제거)
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture;"
          allowFullScreen
        />
      </div>
    </div>
  );
}
