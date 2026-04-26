/**
 * File Name : features/notification/components/KeywordAlertManager.tsx
 * Description : 키워드 등록 및 관리 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.13  임도헌   Created
 * 2026.02.21  임도헌   Modified  키워드 범위(RegionRange) 선택 Select 추가
 * 2026.02.21  임도헌   Modified  Select 컴포넌트 초기값 Fallback 방어 로직 추가
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.12  임도헌   Modified  접기/펼치기 가능한 키워드 관리 카드 구조로 전환
 * 2026.03.15  임도헌   Modified  알림 설정 페이지 통합 기준으로 설명 주석 정리
 * 2026.03.16  임도헌   Modified  모달 재사용을 위해 비접기 모드와 즉시 refresh 동기화 지원 추가
 * 2026.03.19  임도헌   Modified  모바일에서 Select/입력 폼 줄바꿈을 허용해 좁은 폭 모달의 정보 밀도를 완화
 * 2026.03.22  임도헌   Modified  지역 범위 Select 고정 폭을 제거해 좁은 폭 설정 화면 밀도 완화
 * 2026.04.18  임도헌   Modified  모바일 키워드 입력 바가 한 줄 안에서 안정적으로 보이도록 입력/추가 버튼 배치를 재정리
 * 2026.04.26  임도헌   Modified  키워드 알림 등록 성공 문구를 관리 목록의 삭제 문구와 같은 문법으로 정리
 */

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MAX_KEYWORD_PER_USER } from "@/lib/constants";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
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
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * 키워드 알림 관리자 (등록 폼 + 관리 목록)
 *
 * - 알림 설정 페이지에서 키워드와 지역 범위를 함께 설정해 등록
 * - 알림 센터 모달에서도 같은 UI를 재사용
 * - 유저의 `userLocation` 정보를 활용하여 동/구/시 단위의 정확한 행정구역명을 표시
 * - 등록/삭제 성공 시 router.refresh로 현재 화면 목록을 즉시 동기화
 *
 * @param initialKeywords - 기존 등록된 키워드 목록
 * @param userLocation - 범위 선택 Select 렌더링용 유저 지역 데이터
 */
export default function KeywordAlertManager({
  initialKeywords,
  userLocation,
  collapsible = true,
  defaultExpanded = false,
}: KeywordAlertManagerProps) {
  const router = useRouter();
  const dbRange = userLocation.regionRange as RegionRange;
  const hasDistinctGu =
    !!userLocation.region2 && userLocation.region2 !== userLocation.region1;

  // DB 저장값과 실제 지역 데이터 불일치 대비 기본 범위 보정
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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  /**
   * 키워드 등록 요청과 목록 새로고침
   */
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
        // 등록 성공 뒤 입력 초기화와 목록 재동기화
        toast.success(`'${val}' 키워드 알림을 등록했어요.`);
        setKeyword("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface shadow-sm">
      <div
        className={`flex w-full items-center justify-between gap-3 px-5 py-4 ${
          collapsible ? "text-left" : ""
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TagIcon className="size-5 text-brand dark:text-brand-light" />
            <h2 className="text-base font-bold text-primary">
              키워드 알림 관리
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            {initialKeywords.length}개 등록됨 · 최대 {MAX_KEYWORD_PER_USER}개
          </p>
        </div>
        {collapsible &&
          (isExpanded ? (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="focus-ring-soft inline-flex shrink-0 items-center justify-center rounded-full p-1 text-muted hover:bg-surface-dim hover:text-primary"
              aria-label="키워드 관리 접기"
            >
              <ChevronUpIcon className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="focus-ring-soft inline-flex shrink-0 items-center justify-center rounded-full p-1 text-muted hover:bg-surface-dim hover:text-primary"
              aria-label="키워드 관리 펼치기"
            >
              <ChevronDownIcon className="size-5" />
            </button>
          ))}
      </div>

      {(!collapsible || isExpanded) && (
        <div className="space-y-4 border-t border-border-subtle px-5 py-4">
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="w-full">
              <Select
                value={selectedRange}
                onChange={(e) =>
                  setSelectedRange(e.target.value as RegionRange)
                }
                className="h-10 text-xs font-medium"
              >
                {/* 유저 지역 데이터 기준 범위 옵션 노출 */}
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

            <div className="flex items-stretch gap-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="관심 있는 물품 키워드"
                className="input-primary h-10 min-w-0 flex-1 border-none bg-surface-dim px-4 text-sm"
                disabled={isPending}
              />
              <button
                type="submit"
                disabled={isPending || !keyword.trim()}
                className="btn-primary flex h-10 w-12 shrink-0 items-center justify-center rounded-xl px-0"
                aria-label="키워드 추가"
              >
                {isPending ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-gray-900/30 dark:border-t-gray-900" />
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
      )}
    </div>
  );
}
