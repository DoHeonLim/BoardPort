/**
 * File Name : app/(tabs)/products/add/page.tsx
 * Description : 제품 업로드 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.17  임도헌   Created
 * 2024.10.17  임도헌   Modified  제품 업로드 페이지 추가
 * 2024.10.19  임도헌   Modified  폼 에러 추가
 * 2024.11.11  임도헌   Modified  클라우드 플레어 이미지 연결
 * 2024.11.11  임도헌   Modified  react hook form을 사용하는 코드로 변경
 * 2024.12.12  임도헌   Modified  products/add 에서 add-product로 이동
 * 2024.12.16  임도헌   Modified  제품 업로드를 보드게임 형식으로 변경
 * 2024.12.18  임도헌   Modified  태그 입력 컴포넌트로 분리
 * 2024.12.31  임도헌   Modified  태그 입력 컴포넌트 수정
 * 2025.04.13  임도헌   Modified  completeness 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  condition 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  game_type 필드를 영어로 변경
 * 2025.04.18  임도헌   Modified  보드게임 최대 인원수 8명으로 변경
 * 2025.04.18  임도헌   Modified  기존 초기화 버튼은 이미지만 초기화 됬었음, 전체 초기화로 변경
 * 2025.04.18  임도헌   Modified  업로드 버튼 위치 변경
 * 2025.04.28  임도헌   Modified  tag 초기화 로직 변경(setvalue에서 control과 reset사용)
 * 2025.05.23  임도헌   Modified  카테고리 필드명 변경(name->kor_name)
 * 2025.06.12  임도헌   Modified  Form을 컴포넌트로 분리(ProductAddForm)
 * 2025.06.15  임도헌   Modified  제품 등록 및 편집 폼 통합
 * 2025.07.30  임도헌   Modified  fetchProductCategories로 이름 변경
 * 2026.01.11  임도헌   Modified  프래그먼트 태그 제거
 * 2026.01.26  임도헌   Modified  주석 설명 보강
 */

import ProductForm from "@/features/product/components/ProductForm";
import { fetchProductCategories } from "@/features/product/service/category";
import { createProductAction } from "@/features/product/actions/create";

/**
 * 제품 등록 페이지
 *
 * - 카테고리 목록을 서버에서 미리 로드하여 폼에 주입
 * - `ProductForm`을 'create' 모드로 렌더링
 */
export default async function AddPage() {
  const categories = await fetchProductCategories();

  return (
    <ProductForm
      mode="create"
      action={createProductAction}
      categories={categories}
    />
  );
}
