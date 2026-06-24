/**
 * File Name : features/report/components/admin/AdminScopeNotice.tsx
 * Description : 관리자 상단 인사이트와 하단 리스트의 기준 차이를 설명하는 안내 배너
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   관리자 인사이트/리스트 기준 차이를 설명하는 공통 안내 배너 추가
 * 2026.03.30  임도헌   Modified  검색·필터가 걸린 목록 문맥까지 설명할 수 있도록 재사용 범위를 확장
 * 2026.04.10  임도헌   Modified  안내 배너의 상단 라벨 크기를 공통 타이포 스케일로 정리
 */

interface AdminScopeNoticeProps {
  title?: string;
  description: string;
}

/**
 * 관리자 상단 인사이트와 하단 리스트의 기준 차이를 설명하는 공통 배너
 *
 * [기능]
 * 1. 전체 기준 인사이트와 현재 검색/필터 기준 리스트 문맥 차이를 안내
 * 2. 관리자 페이지마다 재사용 가능한 동일한 안내 톤 유지
 *
 * @param props - 배너 제목과 설명 문구
 * @returns 관리자 화면 상단에 배치하는 기준 안내 배너
 */
export default function AdminScopeNotice({
  title = "기준 안내",
  description,
}: AdminScopeNoticeProps) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-dim/20 px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
