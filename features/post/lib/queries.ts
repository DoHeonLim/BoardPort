/**
 * File Name : features/post/lib/queries.ts
 * Description : 게시글 검색 조건 쿼리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 검색 조건 쿼리 함수 생성
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 * 2026.01.19  임도헌   Renamed   getPostSearchCondition -> queries로 이름 변경
 */

import { Prisma } from "@/generated/prisma/client";

export interface PostSearchParams {
  keyword?: string;
  category?: string;
}

export function getPostSearchCondition({
  keyword,
  category,
}: PostSearchParams): Prisma.PostWhereInput {
  return {
    AND: [
      keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { description: { contains: keyword } },
              {
                tags: {
                  some: {
                    name: { contains: keyword },
                  },
                },
              },
            ],
          }
        : {},
      category ? { category } : {},
    ],
  };
}
