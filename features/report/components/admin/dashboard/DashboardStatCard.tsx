/**
 * File Name : features/report/components/admin/dashboard/DashboardStatCard.tsx
 * Description : 관리자 대시보드 통계 카드 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   app/admin/page.tsx에서 분리 및 이름 변경
 */

"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
  trend?: string;
  description?: string;
  href?: string;
}

/**
 * 대시보드 통계 카드 위젯
 *
 * [기능]
 * 1. 핵심 지표(제목, 값, 아이콘)를 카드 형태로 시각화
 * 2. 전월 대비 증감률(Trend) 또는 부가 설명 표시
 * 3. 클릭 시 관련 관리 페이지로 이동하는 링크 기능 (Optional)
 * 4. 중요 지표(예: 신고 대기)에 대한 강조(Highlight) 스타일 지원
 */
export default function DashboardStatCard({
  title,
  value,
  icon,
  highlight = false,
  trend,
  description,
  href,
}: DashboardStatCardProps) {
  const CardContent = (
    <div
      className={cn(
        "p-6 rounded-2xl border shadow-sm transition-all h-full flex flex-col justify-between",
        "bg-surface", // 시맨틱 배경
        highlight
          ? "border-danger/30 ring-4 ring-danger/5" // 강조 모드 (신고 대기 등)
          : "border-border", // 일반 모드
        href &&
          "hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]"
      )}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-muted uppercase tracking-wider">
            {title}
          </span>
          <div
            className={cn(
              "p-2.5 rounded-xl transition-colors",
              highlight
                ? "bg-danger/10 text-danger"
                : "bg-surface-dim text-brand dark:text-brand-light"
            )}
          >
            {icon}
          </div>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-3xl font-black tabular-nums",
              highlight ? "text-danger" : "text-primary"
            )}
          >
            {value.toLocaleString()}
          </span>
          <span className="text-sm font-bold text-muted">건</span>
        </div>
      </div>

      {(trend || description) && (
        <div className="mt-5 pt-4 border-t border-border/50">
          {trend && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
              <span>📈</span> {trend}
            </p>
          )}
          {description && (
            <p className="text-xs font-medium text-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-2xl"
      >
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
