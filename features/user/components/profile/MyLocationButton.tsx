/**
 * File Name : features/user/components/profile/MyLocationButton.tsx
 * Description : 내 동네 설정 버튼 및 모달 연동
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.15  임도헌   Created   variant(header/profile)에 따른 조건부 렌더링 구현
 * 2026.02.26  임도헌   Modified  동네 설정 버튼 UI 개선
 */
"use client";

import { useState, useTransition } from "react";
import { MapPinIcon } from "@heroicons/react/24/solid";
import { MapPinIcon as OutlineMapPin } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import NeighborhoodSearchModal from "./NeighborhoodSearchModal";
import { updateUserLocationAction } from "@/features/user/actions/profile";
import { LocationData } from "@/features/map/types";
import { cn } from "@/lib/utils";

interface Props {
  currentRegion?: string | null; // 예: "금정구"
  fullLocation?: string | null; // 예: "부산 금정구 부곡동" (툴팁용)
  variant?: "profile" | "header"; // 스타일 변형
}

/**
 * 내 동네 설정 버튼 컴포넌트
 *
 * [기능]
 * 1. 프로필 페이지 또는 헤더에서 내 동네를 설정하는 진입점을 제공
 * 2. 클릭 시 `LocationPicker` 모달을 열어 위치 선택 프로세스를 시작
 * 3. 설정 완료 시 서버 액션을 호출하여 유저 정보를 갱신
 */
export default function MyLocationButton({
  currentRegion,
  fullLocation,
  variant = "profile",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (data: LocationData) => {
    startTransition(async () => {
      const res = await updateUserLocationAction(data);
      if (res.success) {
        toast.success(
          `'${data.region2} ${data.region3}'(으)로 동네가 설정되었습니다.`
        );
        setIsOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  if (variant === "header") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 text-sm font-bold text-primary hover:text-brand transition-colors"
          title={fullLocation || "동네를 설정해주세요"}
        >
          <MapPinIcon className="size-4 text-brand" />
          <span>{currentRegion || "동네 설정"}</span>
        </button>
        {isOpen && (
          <NeighborhoodSearchModal
            onClose={() => setIsOpen(false)}
            onSelect={handleSelect}
          />
        )}
      </>
    );
  }

  // Profile Style (Card/Box)
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        className={cn(
          "flex w-full items-center justify-between p-4 rounded-xl border transition-all",
          "bg-surface border-border hover:border-brand/50 dark:hover:border-brand-light/50 hover:shadow-sm group",
          !currentRegion && "border-dashed bg-surface-dim/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2.5 rounded-full transition-colors",
              currentRegion
                ? "bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light"
                : "bg-surface-dim text-muted group-hover:bg-brand/5 dark:group-hover:bg-brand-light/10 group-hover:text-brand dark:group-hover:text-brand-light"
            )}
          >
            {currentRegion ? (
              <MapPinIcon className="size-6" />
            ) : (
              <OutlineMapPin className="size-6" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-primary">
              {currentRegion ? "내 동네" : "동네 설정하기"}
            </p>
            <p className="text-xs text-muted">
              {currentRegion
                ? fullLocation
                : "직거래를 위해 동네를 설정해주세요"}
            </p>
          </div>
        </div>
        <div className="text-xs font-medium text-brand">
          {currentRegion ? "변경" : "설정"}
        </div>
      </button>

      {isOpen && (
        <NeighborhoodSearchModal
          onClose={() => setIsOpen(false)}
          onSelect={handleSelect}
        />
      )}
    </>
  );
}
