/**
 * File Name : app/products/view/[id]/layout.tsx
 * Description : 제품 상세 상단바 레이아웃(뒤로가기 + 카테고리 칩 + (소유자) 편집)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   제품 상세 전용 상단바 도입
 * 2026.01.10  임도헌   Modified  [Rule 3.2]모바일 뷰 제약 준수 & 시맨틱 토큰 적용
 */
import type { ReactNode } from "react";
import Link from "next/link";
import BackButton from "@/components/global/BackButton";
import { getProductTopbar } from "@/features/product/service/detail";
import { cn } from "@/lib/utils";

export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const id = Number(params.id);
  const { categoryId, categoryLabel, categoryIcon, isOwner } =
    await getProductTopbar(id);

  return (
    // [Layout] 배경색 및 텍스트 색상 통일
    <div className="min-h-screen bg-background text-primary transition-colors">
      {/* [Sticky Header] max-w-mobile 적용하여 중앙 정렬 유지 */}
      <header
        className="sticky top-0 z-40 h-14 w-full bg-background/80 backdrop-blur-md border-b border-border transition-colors"
        role="banner"
      >
        <div className="mx-auto max-w-mobile h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/products" variant="appbar" />
          </div>

          <div className="flex items-center gap-2">
            {/* 카테고리 칩 (바로가기) */}
            {categoryId && categoryLabel && (
              <Link
                href={`/products?category=${encodeURIComponent(String(categoryId))}`}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  "bg-surface-dim text-muted hover:bg-surface hover:text-primary border border-transparent hover:border-border"
                )}
                aria-label={`카테고리 ${categoryLabel}로 보기`}
              >
                {categoryIcon && <span>{categoryIcon}</span>}
                {categoryLabel}
              </Link>
            )}

            {/* 소유자 편집 버튼 (헤더에도 노출) */}
            {isOwner && (
              <Link
                href={`/products/view/${id}/edit`}
                className="hidden sm:inline-flex text-xs font-medium text-muted hover:text-primary transition-colors"
              >
                수정
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* [Content] 본문도 max-w-mobile 제약 안에서 렌더링 (AppWrapper가 있더라도 중첩 안전) */}
      <main className="mx-auto max-w-mobile">{children}</main>
    </div>
  );
}
