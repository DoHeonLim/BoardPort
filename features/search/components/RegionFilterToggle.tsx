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
 * 2026.03.07  임도헌   Modified  구 단위가 없는 지역에서도 시/전국 범위 토글은 유지되도록 조건 수정
 * 2026.03.11  임도헌   Modified  제품/게시글 헤더의 중립 톤 버튼 스타일과 긴 지역명 truncate 처리를 추가
 * 2026.03.12  임도헌   Modified  낙관적 업데이트, toast, refresh 기반 범위 변경 흐름 명확화
 * 2026.03.14  임도헌   Modified  트리거 버튼 max-w 및 label truncate 추가, 드롭다운 너비 반응형 처리, 전국 이모지를 GlobeAltIcon으로 교체
 * 2026.03.14  임도헌   Modified  시 단위 아이콘을 GlobeAltIcon에서 BuildingLibraryIcon으로 교체해 전국과 시각적 구분
 * 2026.03.23  임도헌   Modified  지역 범위 드롭다운 외곽선과 내부 구분선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.03.27  임도헌   Modified  다크모드 드롭다운 활성 항목 대비를 높여 전국/범위 선택 가시성을 보강
 * 2026.04.10  임도헌   Modified  검색 타이포 정책에 맞춰 범위 라벨/드롭다운 헤더 weight를 500 기준으로 정리
 * 2026.04.20  임도헌   Modified  제품 헤더 범위 토글과 드롭다운 항목에 공용 포커스 링을 적용해 헤더 포커스 문법을 통일
 * 2026.04.20  임도헌   Modified  모바일에서는 지역 범위 선택을 BottomSheet로 제공해 제품/게시글 헤더의 조작 밀도와 모달 패턴을 통일
 * 2026.06.18  임도헌   Modified  도 단위 주소 정규화 정책에 맞춰 시/군 단위 표현과 주석 정리
 */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BottomSheet from "@/components/global/BottomSheet";
import {
  MapPinIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  BuildingOffice2Icon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { MapPinIcon as MapPinSolid } from "@heroicons/react/24/solid";
import { updateUserLocationAction } from "@/features/user/actions/profile";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

// DB에 저장된 RegionRange 타입 호환
type RangeType = "DONG" | "GU" | "CITY" | "ALL";

interface Props {
  userRegion1?: string | null;
  userRegion2?: string | null;
  userRegion3?: string | null;
  currentRange?: RangeType; // 서버 컴포넌트에서 전달받음
  tone?: "default" | "neutral";
}

/**
 * 리스트 페이지용 지역 필터 토글
 *
 * - "내 동네 / 구 단위 / 시/군 단위 / 전국" 범위를 선택하는 UI를 제공
 * - [Change] URL Query(`?region=...`)를 변경하지 않고, `updateUserLocationAction`을 호출하여
 *   DB의 `User.regionRange` 필드를 직접 업데이트 (SSOT: DB).
 * - 세종시 등 '구/군'이 없는 특수 행정구역의 경우 '구 단위' 옵션을 자동으로 숨김 처리
 * - 낙관적 업데이트(Optimistic UI)를 적용하여 클릭 즉시 UI를 변경하고 백그라운드에서 저장
 * - 저장 성공 시 toast와 `router.refresh()`로 서버 상태 재동기화
 *
 * @param userRegion1 - 지역 필터 1차 단위(카카오 1depth 또는 도 단위의 시/군)
 * @param userRegion2 - 지역 필터 2차 단위(구/군, 없으면 userRegion1)
 * @param userRegion3 - 동/읍/면
 * @param currentRange - 현재 설정된 범위 (Server Component에서 주입)
 */
export default function RegionFilterToggle({
  userRegion1,
  userRegion2,
  userRegion3,
  currentRange = "GU",
  tone = "default",
}: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // '구' 단위가 유의미한 지역인지 판별
  // region2가 없거나 region1과 같다면 '구 단위' 필터는 불필요함 (예: 세종시, 구가 없는 시/군)
  const hasDistinctGu = !!userRegion2 && userRegion2 !== userRegion1;
  const activeItemClass =
    "bg-brand/5 font-medium text-brand dark:bg-brand-light/15 dark:text-brand-light";

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
    if (!isOpen || isMobile) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isMobile, isOpen]);

  const applyRange = (rangeValue: RangeType) => {
    if (rangeValue === activeRange) {
      setIsOpen(false);
      return;
    }

    setOptimisticRange(rangeValue);
    setIsOpen(false);

    startTransition(async () => {
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

  const rangeOptionClass =
    "focus-ring-soft flex w-full items-center gap-3 text-left text-sm transition-colors";

  const rangeOptions = (
    <div className={cn("py-2", isMobile ? "space-y-2 py-1" : "")}>
      {!isMobile && (
        <div className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          동네 범위 설정
        </div>
      )}

      {userRegion3 && (
        <button
          onClick={() => applyRange("DONG")}
          className={cn(
            rangeOptionClass,
            isMobile
              ? "rounded-xl border border-border-subtle bg-surface px-4 py-3"
              : "px-4 py-2.5 hover:bg-surface-dim",
            activeRange === "DONG" ? activeItemClass : "text-primary"
          )}
        >
          <MapPinIcon className="size-4 shrink-0 opacity-70" />
          <span>동 단위 ({userRegion3})</span>
        </button>
      )}

      {hasDistinctGu && (
        <button
          onClick={() => applyRange("GU")}
          className={cn(
            rangeOptionClass,
            isMobile
              ? "rounded-xl border border-border-subtle bg-surface px-4 py-3"
              : "px-4 py-2.5 hover:bg-surface-dim",
            activeRange === "GU" ? activeItemClass : "text-primary"
          )}
        >
          <BuildingOffice2Icon className="size-4 shrink-0 opacity-70" />
          <span>구 단위 ({userRegion2})</span>
        </button>
      )}

      <button
        onClick={() => applyRange("CITY")}
        className={cn(
          rangeOptionClass,
          isMobile
            ? "rounded-xl border border-border-subtle bg-surface px-4 py-3"
            : "px-4 py-2.5 hover:bg-surface-dim",
          activeRange === "CITY" ? activeItemClass : "text-primary"
        )}
      >
        <BuildingLibraryIcon className="size-4 shrink-0 opacity-70" />
        <span>시 단위 ({userRegion1})</span>
      </button>

      {!isMobile && <div className="my-1 h-px bg-border-subtle" />}

      <button
        onClick={() => applyRange("ALL")}
        className={cn(
          rangeOptionClass,
          isMobile
            ? "rounded-xl border border-border-subtle bg-surface px-4 py-3"
            : "px-4 py-2.5 hover:bg-surface-dim",
          activeRange === "ALL" ? activeItemClass : "text-primary"
        )}
      >
        <GlobeAltIcon className="size-4 shrink-0 opacity-70" />
        <span>전국 전체보기</span>
      </button>
    </div>
  );

  if (!userRegion1 && !userRegion3) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={cn(
          "focus-ring-soft",
          tone === "neutral"
            ? "flex h-10 max-w-[140px] items-center gap-1.5 rounded-xl border border-border-strong bg-surface-dim px-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-surface sm:max-w-none"
            : "flex max-w-[130px] items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-[background-color,color,border-color,box-shadow] sm:max-w-none",
          tone === "default" &&
            (activeRange === "ALL"
              ? "bg-surface text-muted border-border hover:text-primary hover:bg-surface-dim"
              : "bg-brand text-white border-brand dark:bg-brand-dark dark:text-brand-light dark:border-brand-light/30")
        )}
      >
        {activeRange === "ALL" ? (
          <GlobeAltIcon className="size-3.5 shrink-0" />
        ) : (
          <MapPinSolid className="size-3.5 shrink-0" />
        )}
        {/* 긴 동네명 말줄임 처리 */}
        <span className="truncate max-w-[80px] sm:max-w-none">{label}</span>
        <ChevronDownIcon
          className={cn(
            "size-3 shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isMobile && (
        <BottomSheet
          open={isOpen}
          title="동네 범위 설정"
          description="보고 싶은 지역 범위를 골라 목록을 필터링하세요."
          onClose={() => setIsOpen(false)}
          contentClassName="pt-3"
        >
          {rangeOptions}
        </BottomSheet>
      )}

      {!isMobile && isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 sm:w-56 bg-surface rounded-xl shadow-xl border border-border-subtle z-50 overflow-hidden origin-top-left">
          {rangeOptions}
        </div>
      )}
    </div>
  );
}
