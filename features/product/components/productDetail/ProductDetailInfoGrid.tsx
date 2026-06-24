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
 * 2026.04.14  임도헌   Modified  정보 항목을 실제 dl 구조로 감싸 Lighthouse 접근성 경고를 정리
 * 2026.04.14  임도헌   Modified  상세 스펙 그리드의 구성 원칙과 접근성 의도가 드러나도록 함수 상단 JSDoc 설명을 보강
 */

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
 * 제품의 핵심 스펙을 2열 그리드로 묶어 보여주는 상세 정보 블록.
 * 카테고리, 인원, 플레이 시간, 제품 상태, 구성품 상태, 설명서 포함 여부를
 * 한눈에 비교할 수 있게 정리하고, 각 항목은 dl/dt/dd 구조를 따라 읽기 순서도 유지
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
    /* ProductInfoItem이 dt/dd를 렌더링하므로 부모를 dl로 감싸 시맨틱 구조를 맞춘다. */
    <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-border-subtle bg-surface-dim p-5">
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
    </dl>
  );
}
