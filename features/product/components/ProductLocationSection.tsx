/**
 * File Name : features/product/components/ProductLocationSection.tsx
 * Description : 제품 폼 직거래 장소 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ProductForm의 직거래 장소 선택/변경 UI를 별도 섹션으로 분리
 * 2026.06.18  임도헌   Modified  정규화된 지역 표시 포맷을 사용해 중복 지역명 노출 방지
 * 2026.06.18  임도헌   Modified  상품 거래 기준 지역을 필수 입력 UI로 정리
 */

import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { LocationData } from "@/features/map/types";
import { formatNormalizedRegion } from "@/features/map/utils/normalizeRegion";

interface ProductLocationSectionProps {
  location: LocationData | null;
  onOpenMap: () => void;
  onRemoveLocation: () => void;
  errorMessage?: string;
}

/**
 * 거래 기준 지역 섹션
 *
 * [역할]
 * - 선택된 장소 요약, 변경/삭제 액션, 빈 상태 CTA를 한곳에서 관리
 * - 상품 노출 지역과 거래 기준 위치로 사용되는 필수 입력을 렌더링
 */
export default function ProductLocationSection({
  location,
  onOpenMap,
  onRemoveLocation,
  errorMessage,
}: ProductLocationSectionProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex items-center gap-1 text-sm font-medium text-primary">
        <MapPinIcon className="size-4" />
        거래 기준 지역 <span className="text-danger">*</span>
      </label>
      <p className="text-xs leading-snug text-muted">
        상품이 노출될 동네와 거래 기준 위치로 사용됩니다.
      </p>

      {location ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-surface p-3 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light">
              <MapPinIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">
                {location.locationName}
              </p>
              <p className="truncate text-xs text-muted">
                {formatNormalizedRegion(location)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenMap}
              className="focus-ring-soft px-2 py-1 text-xs font-medium text-muted hover:text-primary"
            >
              변경
            </button>
            <button
              type="button"
              onClick={onRemoveLocation}
              className="focus-ring-soft p-1 text-muted hover:text-danger"
              title="위치 삭제"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenMap}
          className="focus-ring-soft flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-dim/30 text-muted transition-colors hover:border-brand/30 hover:bg-surface-dim hover:text-primary aria-[invalid=true]:border-danger/60 aria-[invalid=true]:bg-danger/5 aria-[invalid=true]:text-danger"
          aria-invalid={!!errorMessage}
        >
          <MapPinIcon className="size-5" />
          <span className="text-sm">거래 기준 지역 선택하기</span>
        </button>
      )}
      {errorMessage && (
        <p className="text-xs font-medium text-danger">{errorMessage}</p>
      )}
    </div>
  );
}
