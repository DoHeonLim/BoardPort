/**
 * File Name : app/(app)/admin/logs/page.tsx
 * Description : 운영 감사 로그 조회 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   관리자 감사 로그 목록 조회 페이지 추가
 * 2026.03.23  임도헌   Modified  page 쿼리를 1 이상의 정수로 정규화해 음수 skip 예외를 방지
 * 2026.03.29  임도헌   Modified  관리자 공통 헤더 토큰, 모바일 카드형 리스트, 검색·필터 파라미터 연동을 함께 정리
 * 2026.03.30  임도헌   Modified  action/targetType 빠른 필터와 실패 상태 안내 카드로 운영 추적 문맥을 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/logs/page.tsx 에서 app/(app)/admin/logs/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.18  임도헌   Modified  헤더 설명을 압축해 감사 로그 첫 페인트와 실패 상태 문구 길이를 함께 정리
 */

import AdminAuditLogListContainer from "@/features/report/components/admin/AdminAuditLogListContainer";
import AdminErrorState from "@/features/report/components/admin/AdminErrorState";
import { getAuditLogsAdminAction } from "@/features/report/actions/log";

export const dynamic = "force-dynamic";

/**
 * 감사 로그 페이지
 * - 관리자가 수행한 주요 액션(정지, 삭제, 권한 변경, 신고 처리 등)의 기록을 조회
 * - 검색·빠른 필터를 통해 누가, 언제, 무엇을, 왜 처리했는지 빠르게 추적
 */
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; action?: string; targetType?: string };
}) {
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const query = searchParams.q || "";
  const action = searchParams.action || "ALL";
  const targetType = searchParams.targetType || "ALL";
  const result = await getAuditLogsAdminAction(page, query, 20, {
    action,
    targetType,
  });

  if (!result.success || !result.data) {
    return (
      <AdminErrorState
        title="감사 로그"
        description="관리자 활동 기록을 조회합니다."
        message="감사 로그를 불러오지 못했습니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          감사 로그
        </h2>
        <p className="mt-1 text-sm text-muted">
          관리자 활동 기록을 조회합니다.
        </p>
      </div>

      <AdminAuditLogListContainer
        data={result.data}
        activeAction={action}
        activeTargetType={targetType}
      />
    </div>
  );
}

