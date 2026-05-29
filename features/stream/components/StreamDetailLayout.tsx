"use client";

/**
 * File Name : features/stream/components/StreamDetailLayout.tsx
 * Description : 스트림 상세 본문과 채팅 레일을 반응형으로 배치하는 레이아웃 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.19  임도헌   Created   채팅 열림 상태에 따라 본문과 채팅 레일을 1열/2열로 전환하는 레이아웃 래퍼 추가
 * 2026.03.21  임도헌   Modified  데스크톱/태블릿은 우측 sticky 채팅 레일, 모바일은 인라인 채팅 섹션을 쓰는 반응형 구조로 정리
 * 2026.03.21  임도헌   Modified  다양한 배율에서도 본문과 채팅이 분리되지 않도록 최대 폭과 레일 간격을 재조정
 * 2026.03.24  임도헌   Modified  채팅 열림 상태를 Provider 대신 스트림 상세 전용 props로 주입받도록 단순화
 * 2026.03.24  임도헌   Modified  모바일 채팅 카드 높이를 고정 범위로 정리해 빈 상태에서 과하게 커 보이지 않도록 보정
 * 2026.04.03  임도헌   Modified  모바일/데스크톱이 단일 채팅 인스턴스를 공유하도록 레이아웃 슬롯을 통합
 * 2026.04.03  임도헌   Modified  모바일 채팅 레일이 작은 기기 고정 높이 대신 남는 뷰포트 높이를 반응형으로 채우도록 조정
 * 2026.05.28  임도헌   Modified  모바일 full-bleed 스트림 상세와 입력 집중 모드 채팅 레일 확장
 * 2026.05.28  임도헌   Modified  모바일 상세 터치 레이어를 상단바 보이기/숨기기 토글로 정리
 * 2026.05.28  임도헌   Modified  상단바 토글 책임을 플레이어 영역으로 이동해 정보 패널 상호작용 보존
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StreamDetailLayoutProps {
  isChatOpen: boolean;
  isChatFocusMode?: boolean;
  detail: ReactNode;
  chat: ReactNode;
}

/**
 * 스트림 상세 레이아웃 래퍼
 *
 * - 채팅이 열려 있으면 lg 이상 화면에서 우측 sticky 채팅 레일을 사용하고, 모바일은 본문 아래 인라인 채팅 섹션으로 전환
 * - 채팅이 닫혀 있으면 본문 단일 컬럼으로 동작
 * - 모바일은 영상과 채팅을 화면 폭에 맞게 붙이고, lg 이상에서만 여백/카드감을 적용
 * - 모바일 입력 집중 모드에서는 영상/상세 영역을 접고 채팅 레일을 남은 viewport에 확장
 * - 데스크톱/태블릿에서는 본문과 채팅 레일이 서로 다른 높이를 가져도 입력창 위치가 흔들리지 않도록 레일 높이를 고정
 */
export default function StreamDetailLayout({
  isChatOpen,
  isChatFocusMode = false,
  detail,
  chat,
}: StreamDetailLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:px-4 lg:overflow-visible",
        isChatOpen
          ? "max-w-[1624px] lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:justify-center lg:items-start lg:gap-2.5 xl:grid-cols-[minmax(0,1fr)_360px]"
          : "max-w-[1080px]"
      )}
    >
      <div
        className={cn(
          "relative min-w-0 shrink-0 transition-[height,opacity,padding] duration-200 lg:pt-2.5",
          isChatOpen && "lg:w-full",
          isChatFocusMode &&
            "max-lg:h-0 max-lg:overflow-hidden max-lg:pt-0 max-lg:opacity-0 max-lg:pointer-events-none"
        )}
      >
        {detail}
      </div>

      {isChatOpen && (
        <aside
          className={cn(
            "min-h-0 min-w-0 flex-1 transition-[margin] duration-200 lg:sticky lg:top-3 lg:mt-2 lg:h-[90dvh] lg:max-h-[90dvh] lg:w-[320px] lg:flex-none xl:w-[360px]",
            isChatFocusMode && "max-lg:mt-0"
          )}
        >
          {chat}
        </aside>
      )}
    </div>
  );
}
