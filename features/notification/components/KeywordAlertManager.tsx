/**
 * File Name : features/notification/components/KeywordAlertManager.tsx
 * Description : 알림 센터 내 키워드 등록 및 관리 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.13  임도헌   Created
 * 2026.02.21  임도헌   Modified  키워드 범위(RegionRange) 선택 Select 추가
 * 2026.02.21  임도헌   Modified  Select 컴포넌트 초기값 Fallback 방어 로직 추가
 * 2026.02.26  임도헌   Modified  다크모드 개선
 */

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MAX_KEYWORD_PER_USER } from "@/lib/constants";
import { PlusIcon, TagIcon } from "@heroicons/react/24/outline";
import Select from "@/components/ui/Select";
import KeywordManagementList from "@/features/notification/components/KeywordManagementList";
import { addKeywordAction } from "@/features/notification/actions/keyword";
import type { RegionRange } from "@/generated/prisma/enums";

interface KeywordItem {
  id: number;
  keyword: string;
  regionRange: RegionRange;
}

interface KeywordAlertManagerProps {
  initialKeywords: KeywordItem[];
  userLocation: {
    region1?: string | null;
    region2?: string | null;
    region3?: string | null;
    regionRange: string;
  };
}

/**
 * 키워드 알림 관리자 (등록 폼 + 관리 목록)
 *
 * - 알림 목록 페이지 상단에 위치하여 키워드와 지역 범위를 함께 설정해 등록
 * - 유저의 `userLocation` 정보를 활용하여 동/구/시 단위의 정확한 행정구역명을 표시
 *
 * @param initialKeywords - 기존 등록된 키워드 목록
 * @param userLocation - 범위 선택 Select 렌더링용 유저 지역 데이터
 */
export default function KeywordAlertManager({
  initialKeywords,
  userLocation,
}: KeywordAlertManagerProps) {
  const dbRange = userLocation.regionRange as RegionRange;
  const hasDistinctGu =
    !!userLocation.region2 && userLocation.region2 !== userLocation.region1;

  //  DB의 range값이 유저의 실제 데이터와 맞지 않을 경우를 대비한 안전한 Fallback
  const safeInitialRange: RegionRange =
    dbRange === "DONG" && !userLocation.region3
      ? "GU"
      : dbRange === "GU" && !hasDistinctGu && !userLocation.region2
      ? "CITY"
      : dbRange === "CITY" && !userLocation.region1
      ? "ALL"
      : dbRange || "GU";

  const [keyword, setKeyword] = useState("");
  const [selectedRange, setSelectedRange] =
    useState<RegionRange>(safeInitialRange);
  const [isPending, startTransition] = useTransition();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = keyword.trim();

    if (!val || val.length < 2) {
      toast.error("키워드를 2자 이상 입력해주세요.");
      return;
    }

    startTransition(async () => {
      const res = await addKeywordAction(val, selectedRange);
      if (res.success) {
        toast.success(`'${val}' 알림이 등록되었습니다.`);
        setKeyword("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-primary flex items-center gap-2">
          <TagIcon className="size-5 text-brand dark:text-brand-light" />
          키워드 알림 설정
        </h2>
        <span className="text-xs text-muted">
          최대 {MAX_KEYWORD_PER_USER}개
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        {/* 범위 선택기 */}
        <div className="w-[150px]">
          <Select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value as RegionRange)}
            className="h-10 text-xs font-medium"
          >
            {userLocation.region3 && (
              <option value="DONG">동 ({userLocation.region3})</option>
            )}
            {hasDistinctGu && (
              <option value="GU">구 ({userLocation.region2})</option>
            )}
            {userLocation.region1 && (
              <option value="CITY">시 ({userLocation.region1})</option>
            )}
            <option value="ALL">전국 전체보기</option>
          </Select>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="관심 있는 물품 키워드"
            className="input-primary h-10 px-4 text-sm bg-surface-dim border-none flex-1"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !keyword.trim()}
            className="btn-primary h-10 px-4 shrink-0 flex items-center justify-center"
          >
            {isPending ? (
              <span className="size-4 border-2 border-white/30 border-t-white dark:border-gray-900/30 dark:border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <PlusIcon className="size-5 dark:text-gray-100" />
            )}
          </button>
        </div>
      </form>

      <div className="pt-2">
        <KeywordManagementList items={initialKeywords} />
      </div>
    </div>
  );
}
