/**
 * File Name : features/user/components/admin/UserInsightHeader.tsx
 * Description : 관리자 유저 관리 상단 인사이트 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   최근 가입 추이와 USER/ADMIN/BANNED 분포를 묶은 관리자 상단 인사이트 헤더 추가
 * 2026.03.30  임도헌   Modified  회원 상태별 후속 관리 화면으로 이어지는 액션 링크를 인사이트 헤더에 추가
 * 2026.04.10  임도헌   Modified  유저 인사이트 헤더의 액션 링크와 KPI weight를 관리자 타이포 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  차트 영역을 지연 로딩 패널로 분리하고 인사이트 링크 prefetch를 비활성화해 초기 유저 관리 부하를 완화
 */

import Link from "next/link";
import UserInsightChartsPanel from "./UserInsightChartsPanel";

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
    "focus-ring-strong block rounded-2xl border bg-surface px-5 py-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-dim/20";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Link
          href="/admin/users"
          prefetch={false}
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            총 회원
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
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
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.todaySignups.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            오늘 새로 유입된 회원 수입니다.
          </p>
        </div>
        <Link
          href="/admin/users?role=BANNED"
          prefetch={false}
          className={`${summaryCardClass} border-danger/20`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            이용 정지
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-danger">
            {summary.bannedUsers.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            현재 제재 상태로 관리 중인 계정 수입니다.
          </p>
        </Link>
        <Link
          href="/admin/users?role=ADMIN"
          prefetch={false}
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            관리자
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.adminUsers.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            운영 권한을 가진 계정 수입니다.
          </p>
        </Link>
      </div>

      <UserInsightChartsPanel
        labels={labels}
        signupSeries={signupSeries}
        statusSlices={statusSlices}
        summary={summary}
      />
    </div>
  );
}
