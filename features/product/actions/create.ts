/**
 * File Name : features/product/actions/create.ts
 * Description : 제품 생성 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.17  임도헌   Created
 * 2024.10.17  임도헌   Modified  제품 업로드 코드 추가
 * 2024.10.19  임도헌   Modified  DB에 저장하는 코드 추가
 * 2024.11.05  임도헌   Modified  캐싱 추가
 * 2024.11.11  임도헌   Modified  클라우드 플레어 이미지 업로드 주소 얻는 함수 추가
 * 2024.12.11  임도헌   Modified  제품 업로드 함수 반환 타입 추가(성공 시 제품 ID 반환) - 클라이언트에서 redirect 처리
 * 2024.12.12  임도헌   Modified  products/add 에서 add-product로 이동
 * 2024.12.16  임도헌   Modified  제품 업로드 보드게임 유형으로 변경
 * 2025.06.12  임도헌   Modified  cloudFlare getUploadUrl 함수 lib로 이동
 * 2025.06.12  임도헌   Modified  fetchCategories를 api에서 server action으로 변경
 * 2025.06.15  임도헌   Modified  제품 등록 로직 lib로 분리 후 연결
 * 2026.01.20  임도헌   Modified  Service(createProduct) 연동, DTO 변환, 세션/리다이렉트 처리
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/(tabs)/products/actions/create.ts -> features/product/actions/create.ts
 * 2026.02.14  임도헌   Modified  location 파싱 후 FormData에 추가
 * 2026.03.05  임도헌   Modified  상품 등록 시 수반되던 파편화된 `revalidateTag` 제거, `queryClient`를 통한 캐시 무효화로 책임 위임
 */
"use server";

import { revalidatePath } from "next/cache";
import getSession from "@/lib/session";
import { createProduct } from "@/features/product/service/create";
import { productFormSchema } from "@/features/product/schemas";
import type { ProductFormResponse, ProductDTO } from "@/features/product/types";

/**
 * 신규 제품 생성 Action
 *
 * 1. 세션 확인 (로그인 필수)
 * 2. FormData 파싱 및 Zod 검증
 * 3. Service 호출 (DB 생성)
 * 4. 성공 시 관련 캐시 태그 및 경로 무효화
 *
 * @param {FormData} formData - 폼 데이터
 * @returns {Promise<ProductFormResponse>} 결과 객체
 */
export async function createProductAction(
  formData: FormData
): Promise<ProductFormResponse> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 1. FormData 파싱
  const photos = formData.getAll("photos[]").map(String);
  const tagsString = formData.get("tags")?.toString() || "[]";
  const tags = JSON.parse(tagsString);
  const locationRaw = formData.get("location")?.toString();
  let locationData = null;
  if (locationRaw) {
    try {
      locationData = JSON.parse(locationRaw);
    } catch {
      console.error("Location parse error");
    }
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    photos,
    game_type: formData.get("game_type"),
    min_players: formData.get("min_players"),
    max_players: formData.get("max_players"),
    play_time: formData.get("play_time"),
    condition: formData.get("condition"),
    completeness: formData.get("completeness"),
    has_manual: formData.get("has_manual") === "true",
    categoryId: formData.get("categoryId"),
    tags,
    location: locationData,
  };

  // 2. Zod 검증
  const parsed = productFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 3. Service 호출
  const dto = parsed.data as unknown as ProductDTO;
  const result = await createProduct(session.id, dto);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // 목록 페이지 강제 갱신
  revalidatePath("/products");
  revalidatePath("/profile");

  return { success: true, productId: result.data.productId };
}
