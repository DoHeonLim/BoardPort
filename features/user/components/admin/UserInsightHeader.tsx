/**
 * File Name : features/user/components/admin/UserInsightHeader.tsx
 * Description : 관리자 유저 관리 상단 인사이트 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   최근 가입 추이와 USER/ADMIN/BANNED 분포를 묶은 관리자 상단 인사이트 헤더 추가
 * 2026.03.30  임도헌   Modified  회원 상태별 후속 관리 화면으로 이어지는 액션 링크를 인사이트 헤더에 추가
 */

import AdminChartCard from "@/features/report/components/admin/charts/AdminChartCard";
import AdminTrendChart from "@/features/report/components/admin/charts/AdminTrendChart";
import AdminDonutChart from "@/features/report/components/admin/charts/AdminDonutChart";
import Link from "next/link";

interface UserInsightHeaderProps {
  labels: string[];
  signupSeries: {
    name: string;
    color: string;
    values: number[];
  }[];
  statusSlices: {
    label: string;
    value: number;
    color: string;
  }[];
  summary: {
    totalUsers: number;
    todaySignups: number;
    bannedUsers: number;
    adminUsers: number;
  };
}

/**
 * 유저 관리 상단 인사이트 헤더
 *
 * [기능]
 * 1. 회원 수/오늘 가입/제재/관리자 KPI를 노출
 * 2. 최근 가입 추이와 회원 상태 분포 차트를 함께 제공
 * 3. 상태별 필터가 걸린 유저 관리 화면으로 후속 이동을 제공
 *
 * @param props - 회원 추이, 상태 분포, KPI 요약 데이터
 * @returns 유저 관리 상단의 운영 인사이트 헤더
 */
export default function UserInsightHeader({
  labels,
  signupSeries,
  statusSlices,
  summary,
}: UserInsightHeaderProps) {
  const summaryCardClass =
    "block rounded-2xl border bg-surface px-5 py-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-dim/20";
  const actionLinkClass =
    "text-xs font-semibold text-muted transition-colors hover:text-brand";
  const legendSlot = signupSeries.map((item) => (
    <div key={item.name} className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-xs font-semibold text-muted">{item.name}</span>
    </div>
  ));

  const signupTotal =
    signupSeries[0]?.values.reduce((acc, value) => acc + value, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Link href="/admin/users" className={`${summaryCardClass} border-border-subtle`}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            총 회원
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.totalUsers.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            현재 보드포트에 등록된 전체 회원 수입니다.
          </p>
        </Link>
        <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            오늘 가입
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.todaySignups.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            오늘 새로 유입된 회원 수입니다.
          </p>
        </div>
        <Link
          href="/admin/users?role=BANNED"
          className={`${summaryCardClass} border-danger/20`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            이용 정지
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-danger">
            {summary.bannedUsers.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            현재 제재 상태로 관리 중인 계정 수입니다.
          </p>
        </Link>
        <Link
          href="/admin/users?role=ADMIN"
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            관리자
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.adminUsers.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            운영 권한을 가진 계정 수입니다.
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <AdminChartCard
          title="최근 30일 가입 추이"
          description="회원 유입 흐름이 언제 올라오는지 읽는 운영용 가입 추이 패널입니다."
          actionSlot={
            <Link href="/admin/users" className={actionLinkClass}>
              회원 목록 보기
            </Link>
          }
          legendSlot={legendSlot}
          insight={`최근 30일 동안 총 ${signupTotal.toLocaleString()}명의 회원이 새로 가입했습니다.`}
        >
          <AdminTrendChart labels={labels} series={signupSeries} />
        </AdminChartCard>

        <AdminChartCard
          title="회원 상태 분포"
          description="일반 회원, 관리자, 제재 계정 비중을 한 번에 보는 상태 분포 패널입니다."
          actionSlot={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/admin/users" className={actionLinkClass}>
                전체 회원
              </Link>
              <Link href="/admin/users?role=ADMIN" className={actionLinkClass}>
                관리자 보기
              </Link>
              <Link href="/admin/users?role=BANNED" className={actionLinkClass}>
                정지 유저 보기
              </Link>
            </div>
          }
          insight={
            statusSlices[0]
              ? `현재 가장 큰 비중은 '${statusSlices[0].label}' 상태입니다.`
              : "아직 집계된 회원 상태 데이터가 없습니다."
          }
        >
          <AdminDonutChart
            centerLabel="USERS"
            centerValue={summary.totalUsers.toLocaleString()}
            slices={statusSlices}
          />
        </AdminChartCard>
      </div>
    </div>
  );
}
