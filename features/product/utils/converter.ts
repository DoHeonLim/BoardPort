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

import { productFormType } from "@/features/product/schemas";
import type { ProductFullDetails } from "@/features/product/types";

/**
 * 제품 상세 정보를 수정 폼(react-hook-form)의 defaultValues 구조로 변환합니다.
 *
 * @param {ProductFullDetails} product - DB에서 조회한 제품 상세 정보
 * @returns {productFormType} 폼 초기값 객체
 */
export function convertProductToFormValues(
  product: ProductFullDetails
): productFormType {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    photos: product.images.map((img) => img.url),
    game_type: product.game_type as any, // Enum 호환성
    min_players: product.min_players,
    max_players: product.max_players,
    play_time: product.play_time,
    condition: product.condition as any,
    completeness: product.completeness as any,
    has_manual: product.has_manual,
    categoryId: product.categoryId,
    tags: product.search_tags.map((tag) => tag.name),
  };
}
