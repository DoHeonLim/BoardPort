/**
 * File Name : features/stream/components/recording/recordingDetail/RecordingTitle.tsx
 * Description : 스트리밍 녹화 상세 - 제목 표시
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.06  임도헌   Created   스트리밍 녹화 상세 상단 헤더 분리
 * 2025.11.26  임도헌   Modified  작성자 정보는 Topbar로 이동, 제목 전용 컴포넌트로 축소
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 (text-primary)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { cn } from "@/lib/utils";

interface RecordingTitleProps {
  title: string;
}

/**
 * 녹화본 제목을 표시
 * 긴 제목은 자동으로 줄바꿈
 */
export default function RecordingTitle({ title }: RecordingTitleProps) {
  return (
    <div className="px-1">
      <h1
        className={cn(
          "text-2xl font-bold leading-tight break-words",
          "text-primary"
        )}
      >
        {title}
      </h1>
    </div>
  );
}
