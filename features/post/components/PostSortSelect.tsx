/**
 * File Name : features/post/components/PostSortSelect.tsx
 * Description : 게시글 목록 URL 정렬 선택 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   검색·카테고리를 유지하는 게시글 정렬 선택 추가
 * 2026.09.08  임도헌   Modified  공용 URL 정렬 select를 사용하는 도메인 옵션 래퍼로 정리
 */

import UrlSortSelect from "@/components/ui/UrlSortSelect";
import type { PostSort } from "@/features/post/types";
import { POST_SORT_OPTIONS } from "@/features/post/utils/postSort";

interface PostSortSelectProps {
  value: PostSort;
}

/**
 * 게시글 정렬 옵션과 기본 최신순을 공용 URL 정렬 select에 전달한다.
 *
 * @param props - 현재 정렬값
 * @returns 게시글 정렬 select
 */
export default function PostSortSelect({ value }: PostSortSelectProps) {
  return (
    <UrlSortSelect
      value={value}
      defaultValue="latest"
      options={POST_SORT_OPTIONS}
      ariaLabel="게시글 정렬"
    />
  );
}
