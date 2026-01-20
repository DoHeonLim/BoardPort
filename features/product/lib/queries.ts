/**
 * File Name : features/product/lib/queries.ts
 * Description : 제품 검색 조건 쿼리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  제품 검색 조건 쿼리 분리
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.19  임도헌   Renamed   getProductSearchCondition -> queries로 이름 변경
 */
import { Prisma } from "@/generated/prisma/client";
import db from "@/lib/db";

interface SearchParams {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  game_type?: string;
  condition?: string;
}

export async function getProductSearchCondition({
  keyword,
  category,
  minPrice,
  maxPrice,
  game_type,
  condition,
}: SearchParams): Promise<Prisma.ProductWhereInput> {
  let categoryCondition: Prisma.ProductWhereInput = {};

  if (category) {
    const categoryId = parseInt(category);
    if (!isNaN(categoryId)) {
      const selectedCategory = await db.category.findUnique({
        where: { id: categoryId },
        include: {
          children: { select: { id: true } },
        },
      });

      if (selectedCategory) {
        if (selectedCategory.parentId === null) {
          categoryCondition = {
            OR: [
              { categoryId: selectedCategory.id },
              {
                categoryId: {
                  in: selectedCategory.children.map((child) => child.id),
                },
              },
            ],
          };
        } else {
          categoryCondition = { categoryId: selectedCategory.id };
        }
      }
    }
  }

  return {
    AND: [
      keyword
        ? {
            OR: [
              {
                title: {
                  contains: keyword,
                  // ❗ SQLite는 mode: "insensitive"를 지원하지 않음(나중에 postgreSQL로 변경)
                },
              },
              {
                description: {
                  contains: keyword,
                },
              },
              {
                search_tags: {
                  some: {
                    name: {
                      contains: keyword,
                    },
                  },
                },
              },
            ],
          }
        : {},
      categoryCondition,
      {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      },
      game_type ? { game_type } : {},
      condition ? { condition } : {},
    ],
  };
}
