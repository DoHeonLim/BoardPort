/**
 * File Name : app/products/view/[id]/layout.tsx
 * Description : 제품 상세 상단바 레이아웃(뒤로가기 + 카테고리 칩 + (소유자) 편집)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   제품 상세 전용 상단바 도입
 * 2026.01.10  임도헌   Modified  [Rule 3.2]모바일 뷰 제약 준수 & 시맨틱 토큰 적용
 * 2026.02.13  임도헌   Modified  상단바에 공유하기 버튼 추가
 * 2026.03.05  임도헌   Modified  상단 수정 링크를 replace로 변경해 뒤로가기 스택 최적화
 * 2026.03.06  임도헌   Modified  제품 상세 상단 액션바 버튼/칩 스타일을 다른 상세 화면과 통일
 */

import type { ReactNode } from "react";
import getSession from "@/lib/session";
import db from "@/lib/db";
import Link from "next/link";
import BackButton from "@/components/global/BackButton";
import ProductOptionMenu from "@/features/product/components/productDetail/ProductOptionMenu";
import ProductShareButton from "@/features/product/components/ProductShareButton";
import { getProductTopbar } from "@/features/product/service/detail";
import { cn } from "@/lib/utils";

/**
 * 상품 상세 상단바 레이아웃
 * - 뒤로가기, 카테고리 칩, 공유 버튼, 관리 메뉴를 포함함
 */
export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const id = Number(params.id);
  const session = await getSession();
  const userId = session?.id ?? null;

  // 1. Topbar용 데이터 및 제목 조회
  const [topbar, productData] = await Promise.all([
    getProductTopbar(id),
    db.product.findUnique({ where: { id }, select: { title: true } }),
  ]);

  const { categoryId, categoryLabel, categoryIcon, isOwner } = topbar;

  // 2. 옵션 메뉴용 판매자 데이터
  let productInfo = null;
  if (!isOwner && userId) {
    productInfo = await db.product.findUnique({
      where: { id },
      select: { userId: true, user: { select: { username: true } } },
    });
  }

  return (
    <div className="min-h-screen bg-background text-primary transition-colors">
      <header
        className="sticky top-0 z-40 h-14 w-full bg-background/80 backdrop-blur-md border-b border-border transition-colors"
        role="banner"
      >
        <div className="mx-auto max-w-mobile h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/products" variant="appbar" />
          </div>

          <div className="flex items-center gap-1">
            {categoryId && categoryLabel && (
              <Link
                href={`/products?category=${encodeURIComponent(String(categoryId))}`}
                className={cn(
                  "appbar-chip hidden xs:inline-flex",
                  "bg-surface-dim text-muted hover:bg-surface hover:text-primary border border-transparent hover:border-border"
                )}
                aria-label={`카테고리 ${categoryLabel}로 보기`}
              >
                {categoryIcon && <span>{categoryIcon}</span>}
                {categoryLabel}
              </Link>
            )}

            {/* 공유 버튼 - 서버 컴포넌트이므로 클라이언트 컴포넌트 주입 */}
            <ProductShareButton title={productData?.title || "보드포트 상품"} />

            {isOwner ? (
              <Link
                href={`/products/view/${id}/edit`}
                replace
                className="appbar-link-btn hidden sm:inline-flex"
              >
                수정
              </Link>
            ) : (
              productInfo && (
                <ProductOptionMenu
                  productId={id}
                  sellerId={productInfo.userId}
                  sellerName={productInfo.user.username}
                />
              )
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-mobile">{children}</main>
    </div>
  );
}
