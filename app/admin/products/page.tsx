/**
 * File Name : app/admin/products/page.tsx
 * Description : 관리자 상품 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   상품 목록 조회 및 UI 컨테이너 연결
 */

import { redirect } from "next/navigation";
import { getProductsAdminAction } from "@/features/product/actions/admin";
import ProductListContainer from "@/features/report/components/admin/ProductListContainer";

export const dynamic = "force-dynamic";

/**
 * 상품 관리 페이지
 * - 전체 등록된 상품을 최신순으로 조회
 * - 부적절한 상품을 강제로 삭제(Hard Delete)하고, 삭제 사유를 Audit Log에 기록
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const page = Number(searchParams.page) || 1;
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
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          상품 관리
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          전체 등록된 상품을 조회하고 부적절한 콘텐츠를 삭제할 수 있습니다.
        </p>
      </div>

      <ProductListContainer data={productData} />
    </div>
  );
}
