/**
 * File Name : features/product/actions/create.ts
 * Description : 제품 생성 서버 액션
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
 * 2026.03.07  임도헌   Modified  태그/위치 JSON 파싱 예외를 정상 실패 응답으로 전환
 * 2026.03.12  임도헌   Modified  GIF 조건부 최적화를 위한 photosAnimated 메타 파싱 및 전달 추가
 * 2026.04.02  임도헌   Modified  파일 설명과 생성 액션 주석을 서버 액션 톤으로 정리
 * 2026.04.04  임도헌   Modified  FormData 파싱/검증/서비스 위임 단계의 인라인 주석 보강
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 id 파싱 추가
 */
"use server";

import { revalidatePath } from "next/cache";
import getSession from "@/lib/session";
import { createProduct } from "@/features/product/service/create";
import { productFormSchema } from "@/features/product/schemas";
import { parseBoardGameIdsFormValue } from "@/features/boardgame/utils/form";
import type { ProductFormResponse, ProductDTO } from "@/features/product/types";

/**
 * 신규 제품 생성 서버 액션
 *
 * [기능]
 * 1. 로그인 세션 확인
 * 2. FormData 파싱 및 Zod 검증
 * 3. 제품 생성 service 호출
 * 4. 성공 시 관련 경로 캐시 무효화
 *
 * @param {FormData} formData - 폼 데이터
 * @returns {Promise<ProductFormResponse>} 생성 결과
 */
export async function createProductAction(
  formData: FormData
): Promise<ProductFormResponse> {
  // 로그인 세션 확인
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 이미지 URL 목록 파싱
  const photos = formData.getAll("photos[]").map(String);
  const photosAnimatedString = formData.get("photosAnimated")?.toString() || "[]";
  let photosAnimated: boolean[] = [];
  try {
    // 이미지 애니메이션 메타 배열 파싱
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

  // 태그 JSON 배열 파싱
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

  // 위치 JSON 파싱
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

  // 연결 보드게임 ID 파싱
  const boardGameIds = parseBoardGameIdsFormValue(formData.get("boardGameIds"));
  if (!boardGameIds) {
    return {
      success: false,
      fieldErrors: {
        boardGameIds: ["보드게임 연결 정보 형식이 올바르지 않습니다."],
      },
    };
  }

  // 스키마 검증용 원시 payload 구성
  const rawData = {
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
    boardGameIds,
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

  // 서비스 계층 전달용 DTO 변환 및 생성 위임
  const dto = parsed.data as unknown as ProductDTO;
  const result = await createProduct(session.id, dto);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // 생성 직후 목록/프로필 판매 문맥 갱신
  revalidatePath("/products");
  revalidatePath("/profile");
  boardGameIds.forEach((boardGameId) => {
    revalidatePath(`/boardgames/${boardGameId}`);
  });

  return { success: true, productId: result.data.productId };
}
