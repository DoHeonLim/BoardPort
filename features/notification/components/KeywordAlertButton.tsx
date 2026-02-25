/**
 * File Name : features/notification/components/KeywordAlertButton.tsx
 * Description : 검색 결과 내 키워드 알림 등록 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.12  임도헌   Created   알림 등록 UI 및 액션 연동
 * 2026.02.21  임도헌   Modified  currentRange Prop 적용 하여 알림에 범위 적용
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
 * - 현재 검색어에 대한 알림 등록 여부를 표시
 * - 알림 등록 시, 유저가 현재 보고 있는 지역 범위(`currentRange`)를 그대로 DB에 저장함
 *   (예: 전국 보기 중 버튼 클릭 -> 전국 알림 등록, 동네 보기 중 클릭 -> 동네 알림 등록)
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
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
        "disabled:opacity-50 active:scale-95",
        isSubscribed
          ? "bg-brand dark:bg-brand-light text-white dark:text-gray-900 border-transparent"
          : "bg-surface text-brand dark:text-brand-light border-brand/20 dark:border-brand-light/30 hover:bg-surface-dim"
      )}
    >
      {isSubscribed ? (
        <>
          <BellSlashIcon className="size-3.5" />
          <span>알림 취소</span>
        </>
      ) : (
        <>
          <BellIcon className={cn("size-3.5", isPending && "animate-pulse")} />
          <span>
            {isPending
              ? "처리 중..."
              : `${rangeLabels[currentRange]} 알림 받기`}
          </span>
        </>
      )}
    </button>
  );
}
