/**
 * File Name : app/admin/products/page.tsx
 * Description : 관리자 상품 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   상품 목록 조회 및 UI 컨테이너 연결
 * 2026.03.23  임도헌   Modified  page 쿼리를 1 이상의 정수로 정규화해 음수 skip 예외를 방지
 * 2026.03.30  임도헌   Modified  검색 기준 안내와 판매자 ID 노출 흐름에 맞춰 운영 추적 문맥을 보강
 */

import { redirect } from "next/navigation";
import { getProductsAdminAction } from "@/features/product/actions/admin";
import AdminProductListContainer from "@/features/report/components/admin/AdminProductListContainer";
import AdminScopeNotice from "@/features/report/components/admin/AdminScopeNotice";

export const dynamic = "force-dynamic";

/**
 * 상품 관리 페이지
 * - 전체 등록된 상품을 최신순으로 조회
 * - 검색된 목록에서 판매자 추적 후 부적절한 상품을 강제로 삭제하고, 사유를 감사 로그에 기록
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const query = searchParams.q || "";

  const result = await getProductsAdminAction(page, query);

  if (!result.success) {
    console.error(result.error);
    redirect("/");
  }

  const productData = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          상품 관리
        </h2>
        <p className="mt-1 text-sm text-muted">
          전체 등록된 상품을 조회하고 부적절한 콘텐츠를 삭제할 수 있습니다.
        </p>
      </div>
      <AdminScopeNotice description="아래 목록은 현재 검색어 기준으로 좁혀진 상품만 보여주며, 원본 보기를 통해 실제 상품 상세로 바로 이동할 수 있습니다." />

      <AdminProductListContainer data={productData} />
    </div>
  );
}
