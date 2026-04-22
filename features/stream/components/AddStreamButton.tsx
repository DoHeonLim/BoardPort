/**
 * File Name : features/stream/components/AddStreamButton.tsx
 * Description : 스트리밍 추가(생성) 플로팅 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.08.25  임도헌   Created    최초 생성
 * 2025.09.09  임도헌   Modified   Tailwind 클래스 보완(누락/오타 수정), a11y/포커스 링/호버 스케일 추가, 아이콘 사용 통일(Heroicons)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.02.26  임도헌   Modified  하단 플로팅 추가 버튼(+) 위치 조정
 * 2026.03.11  임도헌   Modified  모바일 FAB 크기와 하단 여백을 제품/게시글 탭과 통일
 * 2026.04.16  임도헌   Modified  초기 자동 프리패치 대신 hover/touch 시점 프리패치로 이동 체감 보강
 * 2026.04.17  임도헌   Modified  FAB의 의도 기반 프리패치 책임이 주석에서 바로 드러나도록 설명 보강
 */
"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

/**
 * 화면 우측 하단에 고정된 스트리밍 시작 FAB
 *
 * - 기본 렌더에서는 `prefetch={false}`로 두어 초기 네트워크 경합을 줄임
 * - hover/focus/touch처럼 사용 의도가 확인된 시점에만 `/streams/add`를 프리패치
 * - 하단 안전 영역을 고려해 모바일 탭바 위에 안정적으로 고정
 */
export default function AddStreamButton() {
  const router = useRouter();
  const hasPrefetchedRef = useRef(false);

  // 실제 이동 의도 발생 이후에만 작성 페이지 프리패치
  const prefetchOnIntent = () => {
    if (hasPrefetchedRef.current) {
      return;
    }
    hasPrefetchedRef.current = true;
    router.prefetch("/streams/add");
  };

  return (
    <Link
      href="/streams/add"
      prefetch={false}
      onMouseEnter={prefetchOnIntent}
      onFocus={prefetchOnIntent}
      onTouchStart={prefetchOnIntent}
      aria-label="새 스트리밍 생성"
      title="새 스트리밍 생성"
      className={cn(
        "focus-ring-strong fixed z-40 flex items-center justify-center rounded-full transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform duration-300",
        "bg-brand text-white hover:bg-brand-dark dark:bg-brand-light dark:text-gray-100 dark:hover:bg-brand",
        "shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
        "size-12 sm:size-16 bottom-[80px] sm:bottom-24 right-4 sm:right-8",
        // 기기의 하단 안전 여백(Safe Area)을 고려하여 bottom 위치를 동적으로 계산
        "bottom-[calc(80px+env(safe-area-inset-bottom))] sm:bottom-24"
      )}
    >
      <PlusIcon aria-hidden="true" className="size-7 sm:size-10" />
    </Link>
  );
}
