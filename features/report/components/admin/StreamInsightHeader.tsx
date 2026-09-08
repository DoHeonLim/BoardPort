/**
 * File Name : features/report/components/admin/StreamInsightHeader.tsx
 * Description : 관리자 방송 관리 상단 인사이트 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   라이브 운영 KPI와 최근 7일 시작 추이/카테고리 분포를 묶은 상단 인사이트 헤더 추가
 * 2026.03.30  임도헌   Modified  라이브 KPI와 카테고리 분포에서 실제 방송 목록 검색으로 이어지는 액션 링크 보강
 * 2026.04.10  임도헌   Modified  방송 인사이트 헤더의 액션 링크와 KPI weight를 관리자 타이포 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  차트 패널을 분리해 ECharts 번들을 지연 로드하고 링크 prefetch를 줄여 초기 관리자 번들 비용을 완화
 * 2026.09.01  임도헌   Modified  태블릿 인사이트 카드를 두 열로 배치해 좁은 카드에서 지표가 압축되지 않도록 조정
 */

import Link from "next/link";
import StreamInsightChartsPanel from "@/features/report/components/admin/StreamInsightChartsPanel";

interface StreamInsightHeaderProps {
  labels: string[];
  startsSeries: {
    name: string;
    color: string;
    values: number[];
  }[];
  categorySlices: {
    label: string;
    value: number;
    color: string;
  }[];
  summary: {
    liveCount: number;
    startedLast24Hours: number;
    endedLast24Hours: number;
    averageBroadcastHours: number;
  };
}

/**
 * 방송 관리 상단 인사이트 헤더
 *
 * [기능]
 * 1. 현재 라이브/시작/종료/평균 길이 KPI를 노출
 * 2. 최근 7일 시작 추이와 현재 카테고리 분포를 함께 제공
 * 3. 차트와 카드에서 관련 방송 목록으로 후속 이동을 제공
 *
 * @param props - 방송 인사이트 추이, 분포, KPI 요약 데이터
 * @returns 방송 관리 상단의 운영 인사이트 헤더
 */
export default function StreamInsightHeader({
  labels,
  startsSeries,
  categorySlices,
  summary,
}: StreamInsightHeaderProps) {
  const summaryCardClass =
    "focus-ring-strong block rounded-2xl border bg-surface px-5 py-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-dim/20";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/streams"
          prefetch={false}
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            현재 라이브
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.liveCount.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            지금 관리자 화면에서 모니터링 중인 방송 수입니다.
          </p>
        </Link>
        <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            24시간 시작
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.startedLast24Hours.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            최근 하루 동안 새로 시작된 방송 수입니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            24시간 종료
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.endedLast24Hours.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            최근 하루 동안 종료된 방송 수입니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            평균 방송 길이
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.averageBroadcastHours.toFixed(1)}h
          </p>
          <p className="mt-1 text-sm text-muted">
            최근 7일 종료 방송 기준 평균 진행 시간입니다.
          </p>
        </div>
      </div>

      <StreamInsightChartsPanel
        labels={labels}
        startsSeries={startsSeries}
        categorySlices={categorySlices}
        liveCount={summary.liveCount}
      />
    </div>
  );
}
