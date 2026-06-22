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
 * 2026.02.26  임도헌   Modified  게임 타입 UI 수정
 * 2026.03.15  임도헌   Modified  게임 타입 배지 앞 시스템 이모지를 heroicons 기반 아이콘으로 교체
 * 2026.03.25  임도헌   Modified  다크 모드 UP 뱃지 대비 보강 및 모바일 배지 밀도 축소
 * 2026.04.09  임도헌   Modified  판매완료 숨김 상태를 owner 전용 배지로 표시
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 상세 헤더 배지 타이포를 정리
 * 2026.04.14  임도헌   Modified  서버 컨테이너 전환에 맞춰 무상태 헤더 컴포넌트로 정리
 * 2026.06.18  임도헌   Modified  예약/판매완료 거래 상태 배지를 상세 헤더에 표시
 */

import { formatToWon } from "@/lib/utils";
import { GAME_TYPE_DISPLAY } from "@/features/product/constants";
import { GameType } from "@/features/product/types";
import Link from "next/link";
import {
  ArrowUpIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";
import ProductTradeStatusBadge from "@/features/product/components/ProductTradeStatusBadge";

interface ProductDetailHeaderProps {
  title: string;
  price: number;
  game_type: string;
  bumpCount?: number;
  showHiddenBadge?: boolean;
  reservationUserId?: number | null;
  purchaseUserId?: number | null;
}

/**
 * 제품의 핵심 정보(타입, 거래 상태, 제목, 가격)를 표시
 * 게임 타입 배지를 클릭하면 해당 타입 필터 검색으로 이동
 */
export default function ProductDetailHeader({
  title,
  price,
  game_type,
  bumpCount = 0,
  showHiddenBadge = false,
  reservationUserId = null,
  purchaseUserId = null,
}: ProductDetailHeaderProps) {
  const tradeStatus = purchaseUserId
    ? "sold"
    : reservationUserId
      ? "reserved"
      : null;

  return (
    <div className="flex flex-col gap-3">
      {/* 게임 타입 뱃지 */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/products?game_type=${game_type}`}
          className="focus-ring-soft inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand transition-colors hover:bg-brand/20 dark:bg-brand-light/20 dark:text-gray-100"
        >
          <PuzzlePieceIcon className="size-4" />
          {GAME_TYPE_DISPLAY[game_type as GameType] || game_type}
        </Link>
        {/* 끌어올리기 횟수 뱃지 (상세 페이지 강조형) */}
        {bumpCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2 py-1 text-xs font-medium text-brand shadow-sm dark:border-brand-light/25 dark:bg-brand-light/12 dark:text-brand-light sm:px-2.5">
            <ArrowUpIcon className="size-3" />
            UP {bumpCount}회
          </span>
        )}
        {showHiddenBadge && (
          <span className="inline-flex items-center rounded-full border border-border bg-surface-dim px-2 py-1 text-xs font-medium text-muted shadow-sm sm:px-2.5">
            숨김
          </span>
        )}
        {/* 판매 중은 기본 상태라 생략하고, 예약/판매완료만 명시한다. */}
        {tradeStatus && (
          <ProductTradeStatusBadge
            status={tradeStatus}
            className="rounded-full px-2 py-1 sm:px-2.5"
          />
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
