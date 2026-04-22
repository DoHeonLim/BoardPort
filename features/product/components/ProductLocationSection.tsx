/**
 * File Name : features/product/components/ProductLocationSection.tsx
 * Description : 제품 폼 직거래 장소 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ProductForm의 직거래 장소 선택/변경 UI를 별도 섹션으로 분리
 */

import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { LocationData } from "@/features/map/types";

interface ProductLocationSectionProps {
  location: LocationData | null;
  onOpenMap: () => void;
  onRemoveLocation: () => void;
}

/**
 * 직거래 희망 장소 섹션
 *
 * [역할]
 * - 선택된 장소 요약, 변경/삭제 액션, 빈 상태 CTA를 한곳에서 관리
 * - 거래 위치는 선택 사항이므로 필수 입력과 구분되는 보조 섹션으로 렌더링
 */
export default function ProductLocationSection({
  location,
  onOpenMap,
  onRemoveLocation,
}: ProductLocationSectionProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex items-center gap-1 text-sm font-medium text-primary">
        <MapPinIcon className="size-4" />
        직거래 희망 장소 <span className="font-normal text-muted">(선택)</span>
      </label>

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
                {location.region1} {location.region2} {location.region3}
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
          className="focus-ring-soft flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-dim/30 text-muted transition-colors hover:border-brand/30 hover:bg-surface-dim hover:text-primary"
        >
          <MapPinIcon className="size-5" />
          <span className="text-sm">거래 장소 추가하기</span>
        </button>
      )}
    </div>
  );
}
