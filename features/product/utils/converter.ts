/**
 * File Name : features/product/utils/converter.ts
 * Description : 제품 상세 정보를 edit form에 맞는 구조로 변환하는 유틸 함수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created   ProductFullDetails → EditProductType 변환 함수 정의
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Moved     lib/convertProductToFormValues -> utils/converter
 * 2026.01.25  임도헌   Modified  주석 보강
 */

import { productFormValues } from "@/features/product/schemas";
import type {
  CompletenessType,
  ConditionType,
  GameType,
  ProductFullDetails,
} from "@/features/product/types";

/**
 * 제품 상세 정보를 수정 폼(react-hook-form)의 defaultValues 구조로 변환
 *
 * @param {ProductFullDetails} product - DB에서 조회한 제품 상세 정보
 * @returns {productFormValues} 폼 초기값 객체
 */
export function convertProductToFormValues(
  product: ProductFullDetails
): productFormValues {
  // 위치 데이터 변환 로직
  let locationData = null;
  if (product.latitude && product.longitude && product.locationName) {
    locationData = {
      latitude: product.latitude,
      longitude: product.longitude,
      locationName: product.locationName,
      region1: product.region1 ?? "",
      region2: product.region2 ?? "",
      region3: product.region3 ?? "",
    };
  }

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    photos: product.images.map((img) => img.url),
    game_type: product.game_type as GameType,
    min_players: product.min_players,
    max_players: product.max_players,
    play_time: product.play_time,
    condition: product.condition as ConditionType,
    completeness: product.completeness as CompletenessType,
    has_manual: product.has_manual,
    categoryId: product.categoryId,
    tags: product.search_tags.map((tag) => tag.name),
    location: locationData,
  };
}
