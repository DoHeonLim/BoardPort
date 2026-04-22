/**
 * File Name : features/notification/components/KeywordAlertButton.tsx
 * Description : 검색 결과 내 키워드 알림 등록 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.12  임도헌   Created   알림 등록 UI 및 액션 연동
 * 2026.02.21  임도헌   Modified  currentRange Prop 적용 하여 알림에 범위 적용
 * 2026.03.17  임도헌   Modified  작은 화면 제품 목록 헤더 밀도 완화를 위해 모바일 버튼 문구 축약
 * 2026.03.28  임도헌   Modified  다크모드 제품 검색 헤더에서 과하게 튀지 않도록 구독 버튼 톤을 quiet-dark 계열로 조정
 * 2026.03.28  임도헌   Modified  미구독 상태의 다크 버튼을 보조 액션 톤으로 눌러 검색 empty state와 헤더 밀도를 정리
 * 2026.04.17  임도헌   Modified  키워드 알림 토글의 currentRange 전달과 모바일 문구 분기 책임 설명 보강
 */
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";
import {
  addKeywordAction,
  removeKeywordAction,
} from "@/features/notification/actions/keyword";
import { cn } from "@/lib/utils";
import type { RegionRange } from "@/generated/prisma/enums";

interface KeywordAlertButtonProps {
  keyword: string;
  alertId?: number; // 매칭된 알림 ID (있으면 등록된 상태)
  currentRange: RegionRange;
}

const rangeLabels: Record<string, string> = {
  DONG: "동네",
  GU: "구 단위",
  CITY: "시 단위",
  ALL: "전국",
};

/**
 * 키워드 알림 스마트 토글 버튼
 *
 * [기능]
 * - 현재 검색어가 이미 알림 등록되어 있는지(`alertId`)에 따라 등록/취소 액션을 한 버튼에서 토글
 * - 알림 등록 시 사용자가 보고 있는 지역 범위(`currentRange`)를 그대로 서버에 전달해 범위별 알림을 유지
 * - 모바일에서는 짧은 문구를, 데스크톱에서는 범위가 드러나는 문구를 노출해 헤더 밀도와 명확성을 함께 맞춤
 *
 * @param keyword - 등록할 검색어
 * @param alertId - 기존 등록 여부 판단용 ID
 * @param currentRange - 현재 화면의 필터 지역 범위
 */
export default function KeywordAlertButton({
  keyword,
  alertId,
  currentRange,
}: KeywordAlertButtonProps) {
  const [isPending, startTransition] = useTransition();
  const isSubscribed = !!alertId;

  const handleToggle = () => {
    startTransition(async () => {
      const res = isSubscribed
        ? await removeKeywordAction(alertId)
        // 현재 화면 범위 그대로 전달, "동네/구/시/전국" 알림 스코프 보존
        : await addKeywordAction(keyword, currentRange);

      if (res.success) {
        toast.success(
          isSubscribed
            ? `'${keyword}' 알림 취소`
            : `[${rangeLabels[currentRange]}] '${keyword}' 알림 등록 🔔`
        );
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "focus-ring-soft flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold shadow-sm transition-[background-color,color,border-color,box-shadow] sm:px-3",
        "disabled:opacity-50 active:scale-95",
        isSubscribed
          ? "bg-brand text-white border-transparent hover:bg-brand-dark dark:bg-brand-dark dark:text-white dark:hover:bg-brand-dark/80"
          : "bg-surface text-brand border-brand/20 hover:bg-surface-dim dark:bg-surface-dim dark:text-brand-light dark:border-border-strong dark:hover:bg-surface"
      )}
    >
      {isSubscribed ? (
        <>
          <BellSlashIcon
            className={cn("size-3.5", isPending && "animate-pulse")}
          />
          <span className="sm:hidden">{isPending ? "처리" : "취소"}</span>
          <span className="hidden sm:inline">
            {isPending ? "처리 중..." : "알림 취소"}
          </span>
        </>
      ) : (
        <>
          <BellIcon className={cn("size-3.5", isPending && "animate-pulse")} />
          <span className="sm:hidden">{isPending ? "처리" : "받기"}</span>
          <span className="hidden sm:inline">
            {isPending
              ? "처리 중..."
              : `${rangeLabels[currentRange]} 알림 받기`}
          </span>
        </>
      )}
    </button>
  );
}
