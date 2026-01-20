/**
 * File Name : features/product/components/productDetail/ProductDetailHeader.tsx
 * Description : 제품 상세 제목, 가격, 게임유형 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 제목/가격/게임 유형 태그 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */

"use client";

import { formatToWon } from "@/lib/utils";
import { GAME_TYPE_DISPLAY } from "@/lib/constants";
import Link from "next/link";

interface ProductDetailHeaderProps {
  title: string;
  price: number;
  game_type: string;
}

export default function ProductDetailHeader({
  title,
  price,
  game_type,
}: ProductDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* 게임 타입 뱃지 */}
      <div className="flex">
        <Link
          href={`/products?game_type=${game_type}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full bg-brand/10 text-brand dark:bg-brand-light/20 dark:text-brand-light hover:bg-brand/20 transition-colors"
        >
          🎲{" "}
          {GAME_TYPE_DISPLAY[game_type as keyof typeof GAME_TYPE_DISPLAY] ||
            game_type}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-primary leading-tight">{title}</h1>

      <div className="text-xl font-bold text-brand dark:text-brand-light">
        {formatToWon(price)}
        <span className="text-base font-normal text-primary">원</span>
      </div>
    </div>
  );
}
