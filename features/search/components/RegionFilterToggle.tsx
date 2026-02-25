/**
 * File Name : features/search/components/RegionFilterToggle.tsx
 * Description : 리스트 페이지용 지역 필터 토글 (내 동네 / 전국 / 다른 지역)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.15  임도헌   Created
 * 2026.02.15  임도헌   Modified  드롭다운 메뉴 및 지역 검색 모달 연동
 * 2026.02.20  임도헌   Modified '구'가 없는 지역(세종시 등)은 '구 단위' 설정 버튼 자동 숨김 처리
 */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapPinIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { MapPinIcon as MapPinSolid } from "@heroicons/react/24/solid";
import { updateUserLocationAction } from "@/features/user/actions/profile";
import { cn } from "@/lib/utils";

// DB에 저장된 RegionRange 타입 호환
type RangeType = "DONG" | "GU" | "CITY" | "ALL";

interface Props {
  userRegion1?: string | null;
  userRegion2?: string | null;
  userRegion3?: string | null;
  currentRange?: RangeType; // 서버 컴포넌트에서 전달받음
}

/**
 * 리스트 페이지용 지역 필터 토글
 *
 * - "내 동네 / 구 단위 / 시 단위 / 전국" 범위를 선택하는 UI를 제공
 * - [Change] URL Query(`?region=...`)를 변경하지 않고, `updateUserLocationAction`을 호출하여
 *   DB의 `User.regionRange` 필드를 직접 업데이트 (SSOT: DB).
 * - 세종시 등 '구/군'이 없는 특수 행정구역의 경우 '구 단위' 옵션을 자동으로 숨김 처리
 * - 낙관적 업데이트(Optimistic UI)를 적용하여 클릭 즉시 UI를 변경하고 백그라운드에서 저장
 *
 * @param userRegion1 - 시/도
 * @param userRegion2 - 구/군
 * @param userRegion3 - 동/읍/면
 * @param currentRange - 현재 설정된 범위 (Server Component에서 주입)
 */
export default function RegionFilterToggle({
  userRegion1,
  userRegion2,
  userRegion3,
  currentRange = "GU",
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // '구' 단위가 유의미한 지역인지 판별
  // region2가 없거나, region1(시/도)과 region2(구/군)가 같다면 '구 단위' 필터는 불필요함 (예: 세종시)

  const hasDistinctGu = !!userRegion2 && userRegion2 !== userRegion1;
  // 로컬 낙관적 업데이트
  const [optimisticRange, setOptimisticRange] =
    useState<RangeType>(currentRange);
  const activeRange = isPending ? optimisticRange : currentRange;

  // 서버에서 받아온 currentRange가 변경되면 로컬 상태 동기화 (UI Stale 방지)
  useEffect(() => {
    setOptimisticRange(currentRange);
  }, [currentRange]);

  // 버튼 라벨 결정 (구 단위가 없는 지역 배려)
  let label = userRegion2 || userRegion1 || "내 동네";
  if (activeRange === "DONG") label = userRegion3 || label;
  if (activeRange === "CITY") label = userRegion1 || label;
  if (activeRange === "ALL") label = "전국";

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  const applyRange = (rangeValue: RangeType) => {
    if (rangeValue === activeRange) {
      setIsOpen(false);
      return;
    }

    setOptimisticRange(rangeValue);
    setIsOpen(false);

    startTransition(async () => {
      // 기존 updateUserLocationAction을 재사용하되, 다른 필드는 없이 범위만 전송
      const res = await updateUserLocationAction({ regionRange: rangeValue });
      if (!res.success) {
        toast.error(res.error);
        setOptimisticRange(currentRange); // 실패 롤백
      } else {
        toast.success("동네 범위가 설정되었습니다.");
        router.refresh();
      }
    });
  };

  if (!userRegion2) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border",
          activeRange === "ALL"
            ? "bg-surface text-muted border-border hover:text-primary hover:bg-surface-dim"
            : "bg-brand text-white border-brand dark:bg-brand-dark dark:text-brand-light dark:border-brand-light/30"
        )}
      >
        {activeRange === "ALL" ? (
          <GlobeAltIcon className="size-3.5" />
        ) : (
          <MapPinSolid className="size-3.5" />
        )}
        <span>{label}</span>
        <ChevronDownIcon
          className={cn("size-3 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-fade-in origin-top-left">
          <div className="py-2">
            <div className="px-4 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
              동네 범위 설정
            </div>

            {/* 1. 동 단위 (항상 노출) */}
            {userRegion3 && (
              <button
                onClick={() => applyRange("DONG")}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-surface-dim transition-colors",
                  activeRange === "DONG"
                    ? "text-brand font-bold bg-brand/5"
                    : "text-primary"
                )}
              >
                <MapPinIcon className="size-4 opacity-70" />
                <span>동 단위 ({userRegion3})</span>
              </button>
            )}

            {/* 2. 구 단위 (세종시 등 구가 없는 지역은 숨김) */}
            {hasDistinctGu && (
              <button
                onClick={() => applyRange("GU")}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-surface-dim transition-colors",
                  activeRange === "GU"
                    ? "text-brand font-bold bg-brand/5"
                    : "text-primary"
                )}
              >
                <BuildingOffice2Icon className="size-4 opacity-70" />
                <span>구 단위 ({userRegion2})</span>
              </button>
            )}

            {/* 3. 시 단위 (항상 노출) */}
            <button
              onClick={() => applyRange("CITY")}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-surface-dim transition-colors",
                activeRange === "CITY"
                  ? "text-brand font-bold bg-brand/5"
                  : "text-primary"
              )}
            >
              <GlobeAltIcon className="size-4 opacity-70" />
              <span>시 단위 ({userRegion1})</span>
            </button>

            <div className="h-px bg-border my-1" />

            {/* 4. 전국 (항상 노출) */}
            <button
              onClick={() => applyRange("ALL")}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-surface-dim transition-colors",
                activeRange === "ALL"
                  ? "text-brand font-bold bg-brand/5"
                  : "text-primary"
              )}
            >
              <span className="text-lg leading-none grayscale opacity-70">
                🌍
              </span>
              <span>전국 전체보기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
