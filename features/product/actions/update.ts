/**
 * File Name : features/product/actions/update.ts
 * Description : 제품 수정 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.02  임도헌   Created
 * 2024.11.02  임도헌   Modified  제품 편집 폼 액션
 * 2024.11.12  임도헌   Modified  제품 수정 클라우드 플레어로 리팩토링
 * 2024.12.12  임도헌   Modified  제품 편집 폼 액션 코드 추가(여러 이미지 업로드)
 * 2025.04.18  임도헌   Modified  타입 상수 constants로 이동
 * 2025.05.23  임도헌   Modified  카테고리 필드명 변경(name->kor_name)
 * 2025.06.15  임도헌   Modified  제품 수정 로직 lib로 분리 후 연결
 * 2026.01.20  임도헌   Modified  Service 연동, 세션 체크, 캐시 무효화
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.02.14  임도헌   Modified  location 파싱 후 FormData에 추가
 * 2026.03.05  임도헌   Modified  PRODUCT_DETAIL 태그 무효화 책임을 update action으로 이관(revalidateTag 적용), 조회 경로 무효화 제거로 캐시 최적화
 * 2026.03.07  임도헌   Modified  태그/위치 JSON 파싱 예외를 정상 실패 응답으로 전환
 * 2026.03.12  임도헌   Modified  GIF 조건부 최적화를 위한 photosAnimated 메타 파싱 및 전달 추가
 * 2026.04.02  임도헌   Modified  파일 설명과 수정 액션 주석을 현재 서버 액션 톤으로 정리
 */
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import { updateProduct } from "@/features/product/service/update";
import { productFormSchema } from "@/features/product/schemas";
import type { ProductFormResponse, ProductDTO } from "@/features/product/types";

/**
 * 기존 제품 정보 수정 서버 액션
 *
 * [기능]
 * - 로그인 세션과 제품 ID를 확인
 * - FormData를 파싱하고 Zod로 검증
 * - 제품 수정 service를 호출해 소유권 검증과 갱신을 수행
 * - 성공 시 상세/목록 경로 캐시를 무효화
 *
 * @param {FormData} formData - 수정할 데이터가 담긴 폼 데이터
 * @returns {Promise<ProductFormResponse>} 수정 결과와 productId
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

  // 이미지 메타 파싱
  const photos = formData.getAll("photos[]").map(String);
  const photosAnimatedString =
    formData.get("photosAnimated")?.toString() || "[]";
  let photosAnimated: boolean[] = [];
  try {
    const parsedPhotosAnimated = JSON.parse(photosAnimatedString);
    if (!Array.isArray(parsedPhotosAnimated)) {
      return {
        success: false,
        fieldErrors: {
          photos: ["이미지 애니메이션 메타 형식이 올바르지 않습니다."],
        },
      };
    }
    photosAnimated = parsedPhotosAnimated.map(Boolean);
  } catch {
    return {
      success: false,
      fieldErrors: {
        photos: ["이미지 애니메이션 메타 형식이 올바르지 않습니다."],
      },
    };
  }

  // 태그 메타 파싱
  const tagsString = formData.get("tags")?.toString() || "[]";
  let tags: string[] = [];
  try {
    const parsedTags = JSON.parse(tagsString);
    if (!Array.isArray(parsedTags)) {
      return {
        success: false,
        fieldErrors: { tags: ["태그 정보 형식이 올바르지 않습니다."] },
      };
    }
    tags = parsedTags;
  } catch {
    return {
      success: false,
      fieldErrors: { tags: ["태그 정보 형식이 올바르지 않습니다."] },
    };
  }

  // 위치 메타 파싱
  const locationRaw = formData.get("location")?.toString();
  let locationData = null;
  if (locationRaw) {
    try {
      locationData = JSON.parse(locationRaw);
    } catch {
      return {
        success: false,
        fieldErrors: { location: ["위치 정보 형식이 올바르지 않습니다."] },
      };
    }
  }

  const rawData = {
    id: productId,
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    photos,
    photosAnimated,
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

  // 폼 스키마 검증
  const parsed = productFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 수정 DTO 변환 및 서비스 위임
  const dto = parsed.data as unknown as ProductDTO;
  const result = await updateProduct(session.id, productId, dto);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // 상세/목록 캐시 무효화
  revalidateTag(T.PRODUCT_DETAIL(productId));
  revalidatePath("/products");
  revalidatePath(`/products/view/${productId}`);

  return { success: true, productId };
}
