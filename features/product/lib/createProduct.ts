/**
 * File Name : features/product/lib/CreateProduct.ts
 * Description : 제품 등록 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created   제품 등록 로직 서버 액션으로 분리
 * 2025.11.19  임도헌   Modified  프로필 판매 탭/카운트 및 제품 상세 캐시 무효화 추가
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import { revalidateTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { productFormSchema } from "@/features/product/lib/productFormSchema";
import { ProductFormResponse } from "@/types/product";

export const CreateProduct = async (
  formData: FormData
): Promise<ProductFormResponse> => {
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

  const results = productFormSchema.safeParse({ ...rawData });
  if (!results.success) {
    return {
      success: false,
      fieldErrors: results.error.flatten().fieldErrors,
    };
  }

  const session = await getSession();
  if (!session.id) {
    return {
      success: false,
      error: "로그인이 필요합니다.",
    };
  }

  try {
    const productData: Prisma.ProductCreateInput = {
      title: results.data.title,
      description: results.data.description,
      price: results.data.price,
      game_type: results.data.game_type,
      min_players: results.data.min_players,
      max_players: results.data.max_players,
      play_time: results.data.play_time,
      condition: results.data.condition,
      completeness: results.data.completeness,
      has_manual: results.data.has_manual,
      category: { connect: { id: results.data.categoryId } },
      user: { connect: { id: session.id } },
      search_tags: {
        connectOrCreate: results.data.tags.map((tag) => ({
          where: { name: tag },
          create: { name: tag },
        })),
      },
    };

    const product = await db.product.create({ data: productData });

    // 이미지 저장
    await Promise.all(
      results.data.photos.map((url, index) =>
        db.productImage.create({
          data: {
            url,
            order: index,
            product: { connect: { id: product.id } },
          },
        })
      )
    );

    // 태그 사용 횟수 증가
    await db.searchTag.updateMany({
      where: { name: { in: results.data.tags } },
      data: { count: { increment: 1 } },
    });

    // 전체 제품 목록 캐시 무효화
    revalidateTag(T.PRODUCT_LIST());

    // 프로필 판매 탭/카운트 및 제품 상세 캐시 무효화
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", session.id));
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(session.id));
    revalidateTag(T.PRODUCT_DETAIL_ID(product.id));

    return {
      success: true,
      productId: product.id,
    };
  } catch (error) {
    console.error("제품 생성 오류:", error);
    return {
      success: false,
      error: "제품 등록에 실패했습니다.",
    };
  }
};
