/**
 * File Name : app/(app)/admin/boardgames/page.tsx
 * Description : 관리자 보드게임 카탈로그 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   보드게임 import 및 한국어 locale 검수 화면 연결
 * 2026.04.28  임도헌   Modified  Kaggle CSV import 기준 안내 문구로 전환
 * 2026.04.29  임도헌   Modified  BGG API 미사용 및 장문 데이터 제외 범위 주석 정리
 * 2026.05.02  임도헌   Modified  메커니즘/분류 한국어명 CSV import 흐름 안내 추가
 * 2026.05.03  임도헌   Modified  검증된 카테고리 CSV import 흐름 안내 추가
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import { redirect } from "next/navigation";
import { getBoardGamesAdminAction } from "@/features/boardgame/actions/admin";
import AdminBoardGameListContainer from "@/features/boardgame/components/admin/AdminBoardGameListContainer";
import AdminScopeNotice from "@/features/report/components/admin/AdminScopeNotice";

export const dynamic = "force-dynamic";

/**
 * 보드게임 카탈로그 관리 페이지
 *
 * - Kaggle CSV 기반 원천 메타데이터 import
 * - 검증된 카테고리/메커니즘 CSV 연결
 * - category/mechanic 한국어 표시명 보강
 * - 한국어 제목/별칭/짧은 설명 수동 검수
 * - 공개 상태 관리
 * - BGG API 직접 호출과 장문 description import는 제외
 */
export default async function AdminBoardGamesPage(props: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const query = searchParams.q || "";

  const result = await getBoardGamesAdminAction(page, query);

  if (!result.success) {
    console.error(result.error);
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">보드게임 도감 관리</h2>
        <p className="mt-1 text-sm text-muted">
          Kaggle CSV 메타데이터, 카테고리, 메커니즘, 분류 표시명, BoardPort용
          한국어 표시 정보를 검수합니다.
        </p>
      </div>

      <AdminScopeNotice description="BGG API 호출은 사용하지 않습니다. Kaggle CSV의 구조화 메타데이터와 검수된 taxonomy 표시명만 저장하고, 장문 설명·리뷰·사용자 코멘트는 import하지 않습니다." />

      <AdminBoardGameListContainer data={result.data} />
    </div>
  );
}
