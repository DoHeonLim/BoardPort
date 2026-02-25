/**
 * File Name : features/product/components/productDetail/ProductDetailHeader.tsx
 * Description : 제품 제목, 가격, 게임 유형 표시
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 제목/가격/게임 유형 태그 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.03  임도헌   Modified  [UI] 끌어올리기 횟수 뱃지 추가
 */

"use client";

import { formatToWon } from "@/lib/utils";
import { GAME_TYPE_DISPLAY } from "@/features/product/constants";
import { GameType } from "@/features/product/types";
import Link from "next/link";
import { ArrowUpIcon } from "@heroicons/react/24/outline";

interface ProductDetailHeaderProps {
  title: string;
  price: number;
  game_type: string;
  bumpCount?: number;
}

/**
 * 제품의 핵심 정보(타입, 제목, 가격)를 표시
 * 게임 타입 배지를 클릭하면 해당 타입 필터 검색으로 이동
 */
export default function ProductDetailHeader({
  title,
  price,
  game_type,
  bumpCount = 0,
}: ProductDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* 게임 타입 뱃지 */}
      <div className="flex gap-3">
        <Link
          href={`/products?game_type=${game_type}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full bg-brand/10 text-brand dark:bg-brand-light/20 dark:text-brand-light hover:bg-brand/20 transition-colors"
        >
          🎲 {GAME_TYPE_DISPLAY[game_type as GameType] || game_type}
        </Link>
        {/* 끌어올리기 횟수 뱃지 (상세 페이지 강조형) */}
        {bumpCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-surface-dim text-brand border border-border shadow-sm">
            <ArrowUpIcon className="size-3" />
            UP {bumpCount}회
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold text-primary leading-tight">{title}</h1>

      <div className="text-xl font-bold text-brand dark:text-brand-light">
        {formatToWon(price)}
        <span className="text-base font-normal text-primary">원</span>
      </div>
    </div>
  );
}
