/**
 * File Name : features/product/components/productDetail/ProductDetailInfoGrid.tsx
 * Description : 제품 상세 스펙 정보 그리드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 상태/구성 정보 그리드 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.03.15  임도헌   Modified  시스템 정보 라벨 이모지를 heroicons 기반 아이콘으로 교체
 * 2026.03.23  임도헌   Modified  최근 제품 상세 메타 톤에 맞춰 정보 카드 외곽선을 subtle 기준으로 정리
 */

"use client";

import {
  CONDITION_DISPLAY,
  COMPLETENESS_DISPLAY,
} from "@/features/product/constants";
import { ConditionType, CompletenessType } from "@/features/product/types";
import ProductInfoItem from "@/features/product/components/ProductInfoItem";
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  FolderIcon,
  PuzzlePieceIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface ProductDetailInfoGridProps {
  category: {
    eng_name: string;
    kor_name: string;
    icon: string | null;
    parent?: {
      eng_name: string;
      kor_name: string;
      icon: string | null;
    } | null;
  };
  min_players: number;
  max_players: number;
  play_time: string;
  condition: string;
  completeness: string;
  has_manual: boolean;
}

/**
 * 카테고리, 인원, 시간, 상태 등 상세 정보를 2열 그리드로 표시
 */
export default function ProductDetailInfoGrid({
  category,
  min_players,
  max_players,
  play_time,
  condition,
  completeness,
  has_manual,
}: ProductDetailInfoGridProps) {
  const renderLabel = (
    Icon: React.ComponentType<{ className?: string }>,
    text: string
  ) => (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5" />
      {text}
    </span>
  );

  return (
    <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border-subtle bg-surface-dim p-5">
      <ProductInfoItem
        label={renderLabel(FolderIcon, "카테고리")}
        value={
          <span className="flex items-center gap-1.5 flex-wrap">
            {category.parent && (
              <span className="text-muted">
                {category.parent.icon} {category.parent.kor_name} &gt;
              </span>
            )}
            <span className="text-primary font-medium">
              {category.icon} {category.kor_name}
            </span>
          </span>
        }
      />
      <ProductInfoItem
        label={renderLabel(UserGroupIcon, "게임 인원")}
        value={`${min_players} - ${max_players}명`}
      />
      <ProductInfoItem
        label={renderLabel(ClockIcon, "플레이 시간")}
        value={play_time}
      />
      <ProductInfoItem
        label={renderLabel(CubeIcon, "제품 상태")}
        value={CONDITION_DISPLAY[condition as ConditionType]}
      />
      <ProductInfoItem
        label={renderLabel(PuzzlePieceIcon, "구성품 상태")}
        value={COMPLETENESS_DISPLAY[completeness as CompletenessType]}
      />
      <ProductInfoItem
        label={renderLabel(BookOpenIcon, "설명서")}
        value={
          <span className="inline-flex items-center gap-1.5">
            {has_manual ? (
              <CheckCircleIcon className="size-4 text-success" />
            ) : (
              <XCircleIcon className="size-4 text-danger" />
            )}
            {has_manual ? "포함" : "미포함"}
          </span>
        }
      />
    </div>
  );
}
