/**
 * File Name : features/post/utils/postSort.ts
 * Description : 게시글 목록 정렬 query 정규화 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   허용된 게시글 정렬값과 기본 최신순 정규화 추가
 */

import type { PostSort } from "@/features/post/types";

/** 게시글 정렬 선택 UI와 URL 검증에서 공유하는 옵션 */
export const POST_SORT_OPTIONS: ReadonlyArray<{
  value: PostSort;
  label: string;
}> = [
  { value: "latest", label: "최신순" },
  { value: "views", label: "조회순" },
  { value: "likes", label: "좋아요순" },
  { value: "comments", label: "댓글순" },
];

/**
 * URL에서 받은 값을 허용된 게시글 정렬값으로 제한한다.
 *
 * @param value - URL query의 sort 값
 * @returns 허용된 정렬값 또는 기본 최신순
 */
export function normalizePostSort(value: string | null | undefined): PostSort {
  return POST_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as PostSort)
    : "latest";
}
