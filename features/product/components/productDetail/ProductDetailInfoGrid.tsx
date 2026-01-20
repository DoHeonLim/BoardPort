/**
 * File Name : features/product/components/productDetail/ProductDetailInfoGrid.tsx
 * Description : 제품 상세 상태 정보 그리드 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 상태/구성 정보 그리드 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */

"use client";

import { CONDITION_DISPLAY, COMPLETENESS_DISPLAY } from "@/lib/constants";
import ProductInfoItem from "@/features/product/components/ProductInfoItem";

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

export default function ProductDetailInfoGrid({
  category,
  min_players,
  max_players,
  play_time,
  condition,
  completeness,
  has_manual,
}: ProductDetailInfoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-surface-dim border border-border">
      <ProductInfoItem
        label="📁 카테고리"
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
        label="🎮 게임 인원"
        value={`${min_players} - ${max_players}명`}
      />
      <ProductInfoItem label="⌛ 플레이 시간" value={play_time} />
      <ProductInfoItem
        label="📦 제품 상태"
        value={CONDITION_DISPLAY[condition as keyof typeof CONDITION_DISPLAY]}
      />
      <ProductInfoItem
        label="🧩 구성품 상태"
        value={
          COMPLETENESS_DISPLAY[
            completeness as keyof typeof COMPLETENESS_DISPLAY
          ]
        }
      />
      <ProductInfoItem
        label="📖 설명서"
        value={has_manual ? "✅ 포함" : "❌ 미포함"}
      />
    </div>
  );
}
