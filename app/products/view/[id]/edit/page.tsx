/**
 * File Name : app/products/view/[id]/edit/page.tsx
 * Description : 제품 편집 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.02  임도헌   Created
 * 2024.11.02  임도헌   Modified  제품 편집 페이지 추가
 * 2024.12.12  임도헌   Modified  제품 대표 사진 하나 들고오기
 * 2024.12.19  임도헌   Modified  보드게임 형식으로 수정
 * 2024.12.19  임도헌   Modified  타입 정의 추가
 * 2024.12.29  임도헌   Modified  보트포트 형식에 맞게 제품 수정 폼 변경
 * 2025.04.18  임도헌   Modified  삭제하기 버튼 마진 삭제
 * 2025.06.15  임도헌   Modified  제품 등록 및 편집 폼 통합
 * 2025.07.06  임도헌   Modified  getIsOwner함수 lib로 이동
 * 2025.07.30  임도헌   Modified  fetchProductCategories로 이름 변경
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 레이아웃 적용
 * 2026.01.22  임도헌   Modified  Service 직접 호출로 최적화
 * 2026.01.26  임도헌   Modified  주석 설명 보강
 */

import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";
import ProductForm from "@/features/product/components/ProductForm";
import { fetchProductCategories } from "@/features/product/service/category";
import { convertProductToFormValues } from "@/features/product/utils/converter";
import { updateProductAction } from "@/features/product/actions/update";
import { deleteProductAction } from "@/features/product/actions/delete";
import { getCachedProduct } from "@/features/product/service/detail";

/**
 * 제품 수정 페이지
 *
 * [기능]
 * 1. 제품 정보를 조회하고 소유권을 검증합니다. (비소유자 -> 목록 리다이렉트)
 * 2. 기존 제품 정보를 폼 데이터 형식으로 변환(`convertProductToFormValues`)합니다.
 * 3. `ProductForm`을 'edit' 모드로 렌더링합니다.
 * 4. 제품 삭제 기능(Server Action Form)을 별도로 제공합니다.
 */
export default async function EditPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return notFound();

  // 1. 제품 조회 및 권한 확인
  const product = await getCachedProduct(id);
  if (!product) return notFound();

  const session = await getSession();
  const isOwner = session?.id === product.userId;
  if (!isOwner) redirect("/products");

  // 2. 데이터 준비
  const categories = await fetchProductCategories();
  const defaultValues = convertProductToFormValues(product);

  // 3. 삭제 핸들러 (Server Action Wrapper)
  const handleDeleteProduct = async () => {
    "use server";
    await deleteProductAction(id);
    redirect("/products");
  };

  return (
    <div className="min-h-screen bg-background px-page-x py-page-y">
      <h1 className="text-2xl font-bold mb-6 text-primary">
        보드게임 제품 수정
      </h1>

      <ProductForm
        mode="edit"
        action={updateProductAction}
        defaultValues={defaultValues}
        categories={categories}
        // 취소 시 상세 페이지로 돌아가도록 설정
        cancelHref={`/products/view/${id}`}
      />

      <form
        action={handleDeleteProduct}
        className="flex items-center justify-center mt-8"
      >
        {/* 삭제 버튼 */}
        <button className="w-full h-12 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 font-semibold text-base transition-colors">
          제품 삭제하기
        </button>
      </form>
    </div>
  );
}
