/**
 * File Name : features/notification/components/KeywordManagementList.tsx
 * Description : 등록된 키워드 알림 목록 및 삭제 관리 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.12  임도헌   Created   관리 목록 UI 구현
 * 2026.02.21  임도헌   Modified  regionRange 뱃지 노출 추가
 */
"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { removeKeywordAction } from "@/features/notification/actions/keyword";
import { cn } from "@/lib/utils";
import { RegionRange } from "@/generated/prisma/client";

interface Props {
  items: { id: number; keyword: string; regionRange: RegionRange }[];
}

const rangeLabels: Record<string, string> = {
  DONG: "동네",
  GU: "구",
  CITY: "시",
  ALL: "전국",
};

/**
 * 등록된 키워드 알림 목록
 *
 * - 설정된 범위(동네/구/시/전국) 뱃지와 키워드를 나열하고 삭제 기능을 제공
 * - 삭제 중일 때 해당 항목의 투명도를 낮춰 피드백을 제공
 *
 * @param items - 등록된 키워드 및 지역 범위 목록
 */
export default function KeywordManagementList({ items }: Props) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = (id: number, word: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const res = await removeKeywordAction(id);
      if (res.success) toast.success(`'${word}' 알림 해제`);
      setDeletingId(null);
    });
  };

  if (items.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted">등록된 키워드가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "inline-flex items-center gap-1.5 pl-2 pr-2 py-1.5 rounded-full shadow-sm transition-all",
            "bg-surface border border-border text-primary",
            deletingId === item.id && "opacity-50 pointer-events-none"
          )}
        >
          <span className="text-[10px] font-bold text-brand dark:text-brand-light bg-brand/10 px-1.5 py-0.5 rounded">
            {rangeLabels[item.regionRange]}
          </span>
          <span className="text-xs font-bold pl-0.5">{item.keyword}</span>
          <button
            onClick={() => handleDelete(item.id, item.keyword)}
            disabled={isPending}
            className="p-0.5 hover:bg-danger/10 rounded-full text-muted hover:text-danger transition-colors"
            aria-label="삭제"
          >
            <XMarkIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
