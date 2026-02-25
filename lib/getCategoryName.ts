/**
 * File Name : lib/getCategoryName.ts
 * Description : 카테고리 관련 순수 유틸리티 (DB 의존성 없음)
 * Author : 임도헌
 *
 * History
 * 2025.06.07  임도헌   Created   초기 생성
 * 2025.06.12  임도헌   Modified  getCategoryName이 children 포함된 구조가 아니라 flat list 기반으로 작동하도록 수정
 */

import type { Category } from "@/generated/prisma/client";

/**
 * 카테고리 ID를 기반으로 전체 이름(부모 > 자식)을 반환하는 유틸 함수
 * - flat list 기반으로 탐색
 */
export const getCategoryName = (
  categoryId: string,
  categories: Category[]
): string => {
  const id = parseInt(categoryId);
  if (isNaN(id)) return categoryId;

  const current = categories.find((cat) => cat.id === id);
  if (!current) return categoryId;

  const parent = current.parentId
    ? categories.find((cat) => cat.id === current.parentId)
    : null;

  return parent ? `${parent.kor_name} > ${current.kor_name}` : current.kor_name;
};
