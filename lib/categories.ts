/**
 * File Name : lib/categories.ts
 * Description : 카테고리 데이터 조회 및 유틸 (Product & Stream)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.12  임도헌   Created   (fetchProductCategories)
 * 2025.07.30  임도헌   Created   (fetchStreamCategories)
 * 2026.01.19  임도헌   Merged    [Refactor] lib/category/* -> lib/categories.ts (통합)
 */
import db from "@/lib/db";

/**
 * 제품 카테고리 목록 가져오기 (한글 이름 오름차순)
 */
export const fetchProductCategories = async () => {
  try {
    const categories = await db.category.findMany({
      orderBy: {
        kor_name: "asc",
      },
    });
    return categories;
  } catch (error) {
    console.error("카테고리 조회 실패:", error);
    throw new Error("카테고리를 불러오는 데 실패했습니다.");
  }
};

/**
 * 스트리밍 카테고리 목록 가져오기 (한글 이름 오름차순)
 */
export const fetchStreamCategories = async () => {
  try {
    const categories = await db.streamCategory.findMany({
      orderBy: {
        kor_name: "asc",
      },
    });
    return categories;
  } catch (error) {
    console.error("스트리밍 카테고리 조회 실패:", error);
    throw new Error("카테고리를 불러오는 데 실패했습니다.");
  }
};
