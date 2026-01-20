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
 */

import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

export default function AddPostButton() {
  return (
    <Link
      href="/posts/add"
      title="새 게시글 작성"
      aria-label="게시글 작성"
      className={cn(
        "fixed z-40 flex items-center justify-center rounded-full transition-all duration-300",
        "bg-brand text-white hover:bg-brand-dark dark:bg-brand-light dark:text-gray-900 dark:hover:bg-brand",
        "shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
        // [Size] 56px (mobile) ~ 64px (desktop)
        "size-14 sm:size-16 bottom-20 sm:bottom-24 right-4 sm:right-8"
      )}
    >
      <PlusIcon className="size-8 sm:size-10" />
    </Link>
  );
}
