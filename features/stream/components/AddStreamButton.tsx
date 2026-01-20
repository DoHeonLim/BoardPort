/**
 * File Name : features/stream/components/AddStreamButton.tsx
 * Description : 스트리밍 추가(생성) 플로팅 버튼 (우측 하단 고정)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.08.25  임도헌   Created    최초 생성
 * 2025.09.09  임도헌   Modified   Tailwind 클래스 보완(누락/오타 수정), a11y/포커스 링/호버 스케일 추가, 아이콘 사용 통일(Heroicons)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

export default function AddStreamButton() {
  return (
    <Link
      href="/streams/add"
      aria-label="새 스트리밍 생성"
      title="새 스트리밍 생성"
      className={cn(
        "fixed z-40 flex items-center justify-center rounded-full transition-all duration-300",
        "bg-brand text-white hover:bg-brand-dark dark:bg-brand-light dark:text-gray-900 dark:hover:bg-brand",
        "shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
        "size-14 sm:size-16 bottom-20 sm:bottom-24 right-4 sm:right-8"
      )}
    >
      <PlusIcon aria-hidden="true" className="size-8 sm:size-10" />
    </Link>
  );
}
