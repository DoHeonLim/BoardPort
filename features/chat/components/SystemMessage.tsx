/**
 * File Name : features/chat/components/SystemMessage.tsx
 * Description : 채팅방 중앙 시스템 알림 (Bubble 아님)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   시스템 메시지 전용 UI 분리
 * 2026.03.12  임도헌   Modified  채팅 상세에서도 읽기 쉬운 시맨틱 토큰 기반 배너 톤으로 정리
 * 2026.03.16  임도헌   Modified  시스템 메시지 가시성 개선을 위한 반투명/블러 제거
 * 2026.03.28  임도헌   Modified  현재 대화 검색 결과 이동 시 시스템 배너 표면 하이라이트를 지원하도록 확장
 */

import { cn } from "@/lib/utils";

export default function SystemMessage({
  text,
  searchHighlight = null,
}: {
  text: string;
  searchHighlight?: "active" | "hit" | null;
}) {
  return (
    <div className="flex justify-center my-4 px-4 w-full">
      <div
        className={cn(
          "max-w-[85%] break-keep rounded-full border border-border-strong bg-surface px-4 py-1.5 text-center text-xs font-medium leading-relaxed text-primary shadow-md",
          searchHighlight === "active" &&
            "ring-2 ring-brand/55 ring-offset-2 ring-offset-background dark:ring-brand-light/60",
          searchHighlight === "hit" &&
            "ring-1 ring-brand/35 ring-offset-1 ring-offset-background dark:ring-brand-light/40"
        )}
      >
        {text}
      </div>
    </div>
  );
}
