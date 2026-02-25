/**
 * File Name : features/product/service/category.ts
 * Description : 제품 카테고리 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     lib/categories.ts -> features/product/service/category.ts
 */
import "server-only";
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
