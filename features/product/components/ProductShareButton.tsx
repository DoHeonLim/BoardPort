/**
 * File Name : features/product/components/ProductShareButton.tsx
 * Description : 상품 상세 전용 공유 버튼 (클라이언트)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 */
"use client";

import { ShareIcon } from "@heroicons/react/24/outline";
import { handleShare } from "@/lib/utils";

export default function ProductShareButton({ title }: { title: string }) {
  return (
    <button
      onClick={() => handleShare(title)}
      className="p-2 text-muted hover:text-primary rounded-full hover:bg-surface-dim transition-colors"
      aria-label="상품 공유하기"
    >
      <ShareIcon className="size-5" />
    </button>
  );
}
