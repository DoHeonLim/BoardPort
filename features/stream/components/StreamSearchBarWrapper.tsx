/**
 * File Name : features/stream/components/StreamSearchBarWrapper.tsx
 * Description : 스트리밍 전용 검색바 Wrapper
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   posts의 StreamSearchBarWrapper 동일 컨셉
 * 2025.09.10  임도헌   Modified  a11y(role/label), 중복 push 방지, ESC/초기화 버튼, 모바일 키보드 힌트
 * 2025.11.23  임도헌   Modified  모바일 UI 수정
 * 2026.01.14  임도헌   Modified  공통 SearchBar 사용 및 코드 단순화
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/features/search/components/SearchBar";

/**
 * 스트리밍 목록용 검색바 래퍼 컴포넌트
 *
 * - 공통 `SearchBar` 컴포넌트를 사용하여 UI를 렌더링
 * - 검색어 입력 시 URL 쿼리 파라미터(`keyword`)를 업데이트하여 검색을 수행
 * - 검색어가 있을 경우 `/streams?keyword=...`로 이동하고, 없으면 `/streams`로 초기화
 */
export default function StreamSearchBarWrapper() {
  const router = useRouter();
  const sp = useSearchParams();

  const handleSearch = (keyword: string) => {
    const params = new URLSearchParams(sp.toString());
    if (keyword) params.set("keyword", keyword);
    else params.delete("keyword");

    router.push(
      params.toString() ? `/streams?${params.toString()}` : "/streams"
    );
  };

  return (
    <SearchBar
      placeholder="스트리밍 검색"
      value={sp.get("keyword") || ""}
      onSearch={handleSearch}
      autoFocus={false}
    />
  );
}
