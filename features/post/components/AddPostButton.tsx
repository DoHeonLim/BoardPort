/**
 * File Name : features/post/components/AddPostButton.tsx
 * Description : 게시글 추가 플로팅 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 추가 버튼 생성
 * 2026.01.13  임도헌   Modified  [UI] AddProductButton과 스타일 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  하단 플로팅 추가 버튼(+) 위치 조정
 * 2026.03.09  임도헌   Modified  모바일 리스트 가림을 줄이기 위해 FAB 크기와 하단 여백 미세 조정
 * 2026.04.14  임도헌   Modified  /posts/add 선프리패치를 막아 목록 초기 JS 평가 비용을 완화
 * 2026.04.17  임도헌   Modified  게시글 FAB의 no-prefetch와 safe-area 배치 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.04.26  임도헌   Modified  다크모드 FAB 색조를 primary CTA 톤과 맞춰 정리
 */

import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

/**
 * 게시글 목록용 플로팅 작성 버튼(FAB)
 *
 * [기능]
 * - 화면 우측 하단에 고정되어 모바일/데스크톱에서 공통 진입점을 제공
 * - `/posts/add`는 의도 시점에만 로드되도록 `prefetch={false}`로 선프리패치를 막음
 * - 모바일에서는 safe-area inset을 고려해 하단 탭/제스처 영역과 겹치지 않게 배치
 */
export default function AddPostButton() {
  return (
    <Link
      href="/posts/add"
      // 게시글 작성 페이지 JS의 실제 진입 의도 발생 시점 한정 준비
      prefetch={false}
      title="새 게시글 작성"
      aria-label="게시글 작성"
      className={cn(
        "focus-ring-strong fixed z-40 flex items-center justify-center rounded-full transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform duration-300",
        "bg-brand text-white hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark",
        "shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
        "size-12 sm:size-16 bottom-[80px] sm:bottom-24 right-4 sm:right-8",
        // 기기의 하단 안전 여백(Safe Area)을 고려하여 bottom 위치를 동적으로 계산
        "bottom-[calc(80px+env(safe-area-inset-bottom))] sm:bottom-24"
      )}
    >
      <PlusIcon className="size-7 sm:size-10" />
    </Link>
  );
}
