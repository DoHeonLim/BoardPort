/**
 File Name : app/(tabs)/products/actions/create
 Description : 제품 업로드 폼 액션
 Author : 임도헌
 
 History
 Date        Author   Status    Description
 2024.10.17  임도헌   Created
 2024.10.17  임도헌   Modified  제품 업로드 코드 추가
 2024.10.19  임도헌   Modified  DB에 저장하는 코드 추가
 2024.11.05  임도헌   Modified  캐싱 추가
 2024.11.11  임도헌   Modified  클라우드 플레어 이미지 업로드 주소 얻는 함수 추가
 2024.12.11  임도헌   Modified  제품 업로드 함수 반환 타입 추가(성공 시 제품 ID 반환) - 클라이언트에서 redirect 처리
 2024.12.12  임도헌   Modified  products/add 에서 add-product로 이동
 2024.12.16  임도헌   Modified  제품 업로드 보드게임 유형으로 변경
 2025.06.12  임도헌   Modified  cloudFlare getUploadUrl 함수 lib로 이동
 2025.06.12  임도헌   Modified  fetchCategories를 api에서 server action으로 변경
 2025.06.15  임도헌   Modified  제품 등록 로직 lib로 분리 후 연결
 */
"use server";

import { CreateProduct } from "@/features/product/lib/createProduct";

export async function createProductAction(formData: FormData) {
  return await CreateProduct(formData);
}
