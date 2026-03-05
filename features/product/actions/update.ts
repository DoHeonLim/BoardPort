/**
 * File Name : features/product/actions/update.ts
 * Description : 제품 수정 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.02  임도헌   Created
 * 2024.11.02  임도헌   Modified  제품 편집 폼 액션
 * 2024.11.12  임도헌   Modified  제품 수정 클라우드 플레어로 리팩토링
 * 2024.12.12  임도헌   Modified  제품 편집 폼 액션 코드 추가(여러 이미지 업로드)
 * 2025.04.18  읻모헌   Modified  타입 상수 constants로 이동
 * 2025.05.23  임도헌   Modified  카테고리 필드명 변경(name->kor_name)
 * 2025.06.15  임도헌   Modified  제품 수정 로직 lib로 분리 후 연결
 * 2026.01.20  임도헌   Modified  Service 연동, 세션 체크, 캐시 무효화
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.02.14  임도헌   Modified  location 파싱 후 FormData에 추가
 * 2026.03.05  임도헌   Modified  PRODUCT_DETAIL 태그 무효화 책임을 update action으로 이관(revalidateTag 적용), 조회 경로 무효화 제거로 캐시 최적화
 */
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import { updateProduct } from "@/features/product/service/update";
import { productFormSchema } from "@/features/product/schemas";
import type { ProductFormResponse, ProductDTO } from "@/features/product/types";

/**
 * 기존 제품 정보 수정 Action
 * - 폼 데이터를 파싱하고 검증
 * - 로그인 세션을 확인
 * - Service 계층을 호출하여 제품 정보를 업데이트 (소유권 검증 포함)
 * - 성공 시 제품 상세 및 판매자 관련 캐시 태그를 무효화
 *
 * @param {FormData} formData - 수정할 데이터가 담긴 폼 데이터
 * @returns {Promise<ProductFormResponse>} 성공 여부 및 productId
 */
export async function updateProductAction(
  formData: FormData
): Promise<ProductFormResponse> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const idStr = formData.get("id")?.toString();
  const productId = idStr ? Number(idStr) : undefined;

  if (!productId || isNaN(productId)) {
    return { success: false, error: "잘못된 제품 ID입니다." };
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
    id: productId,
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
  const result = await updateProduct(session.id, productId, dto);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // 4. 캐시 무효화
  revalidateTag(T.PRODUCT_DETAIL(productId));
  revalidatePath("/products");
  revalidatePath(`/products/view/${productId}`);

  return { success: true, productId };
}
