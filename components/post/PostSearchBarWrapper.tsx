/**
 * File Name : components/post/PostSearchBarWrapper
 * Description : 게시글 검색 전용 SearchBar 래퍼 (URL 쿼리 변경 처리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 검색을 위한 SearchBarWrapper 컴포넌트 생성
 * 2025.08.25  임도헌   Modified  PostSearchBarWrapper로 이름 변경
 */

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/search/SearchBar";

export default function PostSearchBarWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleSearch = (keyword: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (keyword) {
      params.set("keyword", keyword);
    } else {
      params.delete("keyword");
    }
    router.push(`/posts?${params.toString()}`);
  };

  return (
    <SearchBar
      placeholder="게시글 검색..."
      value={searchParams.get("keyword") || ""}
      onSearch={handleSearch}
    />
  );
}
