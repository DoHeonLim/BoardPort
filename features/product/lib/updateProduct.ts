/**
 * File Name : features/product/lib/updateProduct.ts
 * Description : 제품 수정 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created   제품 수정 로직을 actions에서 분리하여 lib로 이동
 * 2025.11.19  임도헌   Modified  제품 상세 및 프로필 판매 탭/카운트 캐시 무효화 추가
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { productFormSchema } from "@/features/product/lib/productFormSchema";
import { ProductFormResponse } from "@/types/product";

export async function updateProduct(
  formData: FormData
): Promise<ProductFormResponse> {
  // 이미지 리스트 추출 및 검증
  const photos = formData.getAll("photos[]").map(String);
  if (photos.length === 0) {
    return {
      success: false,
      error: "최소 1개 이상의 이미지를 업로드해주세요.",
    };
  }

  const tagsString = formData.get("tags")?.toString() || "[]";
  const tags = JSON.parse(tagsString);

  const rawData = {
    id: formData.get("id"),
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
  };

  const parsed = productFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getSession();
  if (!session?.id) {
    return {
      success: false,
      error: "로그인이 필요합니다.",
    };
  }

  try {
    // 기존 이미지 삭제
    await db.productImage.deleteMany({
      where: { productId: parsed.data.id },
    });

    // 기존 태그 해제
    await db.product.update({
      where: { id: parsed.data.id },
      data: {
        search_tags: { set: [] },
      },
    });

    // 제품 정보 업데이트
    const updated = await db.product.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        price: parsed.data.price,
        game_type: parsed.data.game_type,
        min_players: parsed.data.min_players,
        max_players: parsed.data.max_players,
        play_time: parsed.data.play_time,
        condition: parsed.data.condition,
        completeness: parsed.data.completeness,
        has_manual: parsed.data.has_manual,
        category: {
          connect: { id: parsed.data.categoryId },
        },
        search_tags: {
          connectOrCreate: parsed.data.tags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
    });

    // 새 이미지 추가
    await Promise.all(
      parsed.data.photos.map((url, index) =>
        db.productImage.create({
          data: {
            url,
            order: index,
            product: {
              connect: { id: updated.id },
            },
          },
        })
      )
    );

    // 제품 상세 및 프로필 판매 탭/카운트 캐시 무효화
    revalidateTag(T.PRODUCT_DETAIL_ID(updated.id));
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", updated.userId));
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("RESERVED", updated.userId));
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SOLD", updated.userId));
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(updated.userId));

    // SOLD 상품을 수정했다면, 구매자 my-purchases 리스트/카운트도 최신화
    if (updated.purchase_userId) {
      revalidateTag(
        T.USER_PRODUCTS_SCOPE_ID("PURCHASED", updated.purchase_userId)
      );
      revalidateTag(T.USER_PRODUCTS_COUNTS_ID(updated.purchase_userId));
    }

    return {
      success: true,
      productId: updated.id,
    };
  } catch (err) {
    console.error("제품 수정 중 오류 발생:", err);
    return {
      success: false,
      error: "제품 수정에 실패했습니다.",
    };
  }
}
