/**
 * File Name : features/product/lib/convertProductToFormValues.ts
 * Description : 제품 상세 정보를 edit form에 맞는 구조로 변환하는 유틸 함수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created   ProductFullDetails → EditProductType 변환 함수 정의
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

import { productFormType } from "@/features/product/lib/productFormSchema";
import { ProductFullDetails } from "@/types/product";

// 제품 상세 정보를 EditProductType 형식의 defaultValues로 변환하는 함수
export function convertProductToFormValues(
  product: ProductFullDetails
): productFormType {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    photos: product.images.map((img) => img.url),
    game_type: product.game_type as productFormType["game_type"],
    min_players: product.min_players,
    max_players: product.max_players,
    play_time: product.play_time,
    condition: product.condition,
    completeness: product.completeness,
    has_manual: product.has_manual,
    categoryId: product.categoryId,
    tags: product.search_tags.map((tag) => tag.name),
  };
}
