/**
 * File Name : features/report/components/admin/charts/AdminChartCard.tsx
 * Description : 관리자 차트 공통 카드 셸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   관리자 차트 공통 카드 셸(헤더/범례/본문/인사이트 영역) 추가
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminChartCardProps {
  title: string;
  description?: string;
  insight?: string;
  actionSlot?: ReactNode;
  legendSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 관리자 차트 공통 카드 셸
 *
 * [기능]
 * 1. 제목/설명/액션/범례/본문/인사이트 문구 레이아웃을 표준화
 * 2. 관리자 차트 카드들의 시각적 톤과 구조를 일관되게 유지
 *
 * @param props - 카드 제목, 설명, 슬롯, 차트 본문
 * @returns 관리자 차트 패널용 공통 카드 레이아웃
 */
export default function AdminChartCard({
  title,
  description,
  insight,
  actionSlot,
  legendSlot,
  children,
  className,
}: AdminChartCardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle bg-surface-dim/20 px-5 py-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-bold text-primary">{title}</h3>
          {description ? (
            <p className="text-sm leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actionSlot}
      </div>

      {legendSlot ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-3">
          {legendSlot}
        </div>
      ) : null}

      <div className="flex-1 px-4 py-4 sm:px-5">{children}</div>

      {insight ? (
        <div className="border-t border-border-subtle bg-surface-dim/20 px-5 py-3">
          <p className="text-xs font-medium leading-relaxed text-muted">
            {insight}
          </p>
        </div>
      ) : null}
    </section>
  );
}
