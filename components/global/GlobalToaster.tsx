/**
 * File Name : components/global/GlobalToaster.tsx
 * Description : 화면 폭에 따라 위치와 지속시간을 조정하는 전역 토스트 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.11  임도헌   Created   모바일/데스크톱별 토스트 위치와 스타일을 분기하는 전역 Toaster 컴포넌트 추가
 * 2026.03.11  임도헌   Modified  모바일 토스트를 상단 중앙 카드형으로 조정
 * 2026.03.12  임도헌   Modified  모바일 토스트를 하단 중앙/짧은 지속시간 규칙으로 정리해 헤더 가림을 최소화
 * 2026.03.23  임도헌   Modified  토스트 카드와 닫기 버튼 보더를 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.04.13  임도헌   Modified  모바일 인증 초기 하이드레이션 경량화를 위해 matchMedia 분기를 제거
 */
"use client";

import { Toaster } from "sonner";

/**
 * 전역 토스트 스타일 래퍼
 * - 위치는 기본 top-right를 사용
 * - 모바일 위치는 globals.css의 responsive override가 담당
 */
export default function GlobalToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      expand={false}
      visibleToasts={1}
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          fontSize: "13px",
        },
        classNames: {
          toast:
            "group-[.toaster]:bg-surface group-[.toaster]:text-primary group-[.toaster]:shadow-xl group-[.toaster]:px-3 group-[.toaster]:py-2.5 sm:group-[.toaster]:px-4 sm:group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted",
          actionButton:
            "group-[.toast]:bg-brand group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-surface-dim group-[.toast]:text-muted",
          closeButton:
            "group-[.toast]:bg-surface group-[.toast]:border-border-subtle group-[.toast]:hover:bg-surface-dim",
        },
      }}
    />
  );
}
