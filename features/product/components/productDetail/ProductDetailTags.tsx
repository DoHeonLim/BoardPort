/**
 * File Name : features/product/components/productDetail/ProductDetailTags.tsx
 * Description : 제품 상세 태그 리스트 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 태그 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProductDetailTagsProps {
  tags: { name: string }[];
}

export default function ProductDetailTags({ tags }: ProductDetailTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <Link
          key={index}
          href={`/products?keyword=${encodeURIComponent(tag.name)}`}
          className={cn(
            "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            // 시맨틱 뱃지 색 추가 (bg-badge / text-badge-text)
            "bg-badge text-badge-text",
            "hover:opacity-80 active:scale-95",
            "border border-transparent dark:border-white/10"
          )}
        >
          🏷️{tag.name}
        </Link>
      ))}
    </div>
  );
}
