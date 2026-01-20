/**
File Name : app/products/view/[id]/actions/update
Description : 제품 편집 폼 액션
Author : 임도헌

History
Date        Author   Status    Description
2024.11.02  임도헌   Created
2024.11.02  임도헌   Modified  제품 편집 폼 액션
2024.11.12  임도헌   Modified  제품 수정 클라우드 플레어로 리팩토링
2024.12.12  임도헌   Modified  제품 편집 폼 액션 코드 추가(여러 이미지 업로드)
2025.04.18  읻모헌   Modified  타입 상수 constants로 이동
2025.05.23  임도헌   Modified  카테고리 필드명 변경(name->kor_name)
2025.06.15  임도헌   Modified  제품 수정 로직 lib로 분리 후 연결
*/
"use server";

import { updateProduct } from "@/features/product/lib/updateProduct";

export async function updateProductAction(formData: FormData) {
  return await updateProduct(formData);
}
