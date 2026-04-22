/**
 * File Name : features/report/components/admin/dashboard/DashboardStatCard.tsx
 * Description : 관리자 대시보드 통계 카드 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   app/admin/page.tsx에서 분리 및 이름 변경
 * 2026.03.23  임도헌   Modified  관리자 통계 카드 일반 셸과 하단 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.30  임도헌   Modified  지표별 단위(unit)와 후속 관리 화면 이동 링크를 지원하도록 카드 문맥을 보강
 * 2026.04.10  임도헌   Modified  KPI 수치 weight를 Pretendard subset 3-weight 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  서버 컴포넌트로 정리하고 추이 텍스트 대비를 높여 성능·접근성을 함께 개선
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  unit?: string;
  highlight?: boolean;
  trend?: string;
  description?: string;
  href?: string;
}

/**
 * 관리자 대시보드 KPI 카드
 *
 * [기능]
 * 1. 핵심 지표(제목, 값, 아이콘)를 카드 형태로 시각화
 * 2. 지표 의미에 맞는 단위(unit)와 추이/설명 문구를 함께 표시
 * 3. 클릭 시 관련 관리 페이지로 이동하는 KPI 진입점으로 사용
 * 4. 중요 지표(예: 신고 대기)에 대한 강조(highlight) 스타일 지원
 */
export default function DashboardStatCard({
  title,
  value,
  icon,
  unit = "건",
  highlight = false,
  trend,
  description,
  href,
}: DashboardStatCardProps) {
  const CardContent = (
    <div
      className={cn(
        "p-6 rounded-2xl border shadow-sm transition-[background-color,color,border-color,box-shadow] h-full flex flex-col justify-between",
        "bg-surface", // 시맨틱 배경
        highlight
          ? "border-danger/30 ring-4 ring-danger/5" // 강조 모드 (신고 대기 등)
          : "border-border-subtle", // 일반 모드
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
              "text-3xl font-bold tabular-nums",
              highlight ? "text-danger" : "text-primary"
            )}
          >
            {value.toLocaleString()}
          </span>
          <span className="text-sm font-bold text-muted">{unit}</span>
        </div>
      </div>

      {(trend || description) && (
        <div className="mt-5 pt-4 border-t border-border-subtle">
          {trend && (
            <p className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span aria-hidden="true">📈</span>
              {trend}
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
        className="focus-ring-strong block h-full rounded-2xl"
      >
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
