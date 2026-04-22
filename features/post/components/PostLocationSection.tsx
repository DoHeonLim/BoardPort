/**
 * File Name : features/post/components/PostLocationSection.tsx
 * Description : 게시글 폼 위치 태그 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   PostForm의 위치 선택/변경 UI를 별도 섹션으로 분리
 */

import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { LocationData } from "@/features/map/types";

interface PostLocationSectionProps {
  location: LocationData | null;
  isUploading: boolean;
  onOpenMap: () => void;
  onClearLocation: () => void;
}

/**
 * 게시글 위치 태그 섹션
 *
 * [역할]
 * - 모임 장소/후기 위치처럼 게시글에 연결되는 보조 위치 정보를 표시하고 수정/삭제 액션을 제공
 * - 선택된 위치가 있을 때와 없을 때의 UI를 한곳에서 관리해 `PostForm` 본문 길이를 줄인다
 */
export default function PostLocationSection({
  location,
  isUploading,
  onOpenMap,
  onClearLocation,
}: PostLocationSectionProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex items-center gap-1 text-sm font-medium text-primary">
        <MapPinIcon className="size-4" />
        장소 태그{" "}
        <span className="font-normal text-muted">
          (모임 장소, 후기 위치 등)
        </span>
      </label>

      {location ? (
        <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-surface p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light">
              <MapPinIcon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">
                {location.locationName}
              </p>
              <p className="text-xs text-muted">
                {location.region1} {location.region2} {location.region3}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenMap}
              className="focus-ring-soft px-2 py-1 text-xs font-medium text-muted hover:text-primary"
              disabled={isUploading}
            >
              변경
            </button>
            <button
              type="button"
              onClick={onClearLocation}
              className="focus-ring-soft p-1 text-muted hover:text-danger"
              disabled={isUploading}
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
          disabled={isUploading}
        >
          <MapPinIcon className="size-5" />
          <span className="text-sm">지도에서 위치 찾기</span>
        </button>
      )}
    </div>
  );
}
