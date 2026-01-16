/**
 * File Name : components/product/AddProductButton
 * Description : 제품 추가 플로팅 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */

import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

export default function AddProductButton() {
  return (
    <Link
      href="/products/add"
      title="새 제품 추가"
      aria-label="제품 추가"
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
