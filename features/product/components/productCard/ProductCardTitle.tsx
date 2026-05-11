/**
 * File Name : features/product/components/productCard/ProductCardTitle.tsx
 * Description : 제품 제목
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 제목 전용 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  viewmode 기반의 동적인 line clamp 추가
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.26  임도헌   Modified  Grid 모드일 때 최소 높이(min-h)를 강제
 * 2026.03.06  임도헌   Modified  모바일 그리드에서는 제목 예약 높이를 줄여 카드 하단 공백을 완화
 * 2026.03.06  임도헌   Modified  모바일 그리드 제목 줄간격을 조정해 압축형 카드 흐름을 보강
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 제품 카드 제목 무게를 정리
 * 2026.04.17  임도헌   Modified  카드 제목을 heading 대신 본문 텍스트로 바꿔 프로필 목록 heading-order를 정리
 * 2026.05.04  임도헌   Modified  그리드 제목의 예약 높이를 제거해 1줄 제목 하단 공백 완화
 */
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductCardTitleProps {
  title: string;
  viewMode: ViewMode;
}

/**
 * 제품 제목을 표시
 * - Grid View: 최대 2줄 표시 (line-clamp-2)
 * - List View: 최대 1줄 표시 (line-clamp-1)
 */
export function ProductCardTitle({ title, viewMode }: ProductCardTitleProps) {
  return (
    <p
      className={cn(
        "text-sm font-medium leading-snug text-primary transition-colors group-hover:text-brand dark:group-hover:text-brand-light sm:text-base",
        viewMode === "grid"
          ? "line-clamp-2"
          : "line-clamp-1"
      )}
      title={title}
    >
      {title}
    </p>
  );
}
