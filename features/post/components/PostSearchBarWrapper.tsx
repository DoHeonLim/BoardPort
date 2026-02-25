/**
 * File Name : features/post/components/PostSearchBarWrapper.tsx
 * Description : 게시글 검색 전용 SearchBar 래퍼 (URL 쿼리 변경 처리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 검색을 위한 SearchBarWrapper 컴포넌트 생성
 * 2025.08.25  임도헌   Modified  PostSearchBarWrapper로 이름 변경
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/features/search/components/SearchBar";

/**
 * 게시글 목록용 검색바 래퍼 컴포넌트
 *
 * - 공통 `SearchBar` 컴포넌트를 사용하여 UI를 렌더링
 * - 검색어 입력 시 URL 쿼리 파라미터(`keyword`)를 업데이트하여 검색을 수행
 * - 카테고리 등 다른 쿼리 파라미터는 유지
 */
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
