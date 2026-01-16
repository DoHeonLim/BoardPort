/**
 * File Name : components/stream/StreamSearchBarWrapper
 * Description : 스트리밍 전용 검색바 Wrapper (URL 쿼리 push)
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   posts의 StreamSearchBarWrapper 동일 컨셉
 * 2025.09.10  임도헌   Modified  a11y(role/label), 중복 push 방지, ESC/초기화 버튼, 모바일 키보드 힌트
 * 2025.11.23  임도헌   Modified  모바일 UI 수정
 * 2026.01.14  임도헌   Modified  공통 SearchBar 사용 및 코드 단순화
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/search/SearchBar";

export default function StreamSearchBarWrapper() {
  const router = useRouter();
  const sp = useSearchParams();

  const handleSearch = (keyword: string) => {
    const params = new URLSearchParams(sp.toString());
    if (keyword) params.set("keyword", keyword);
    else params.delete("keyword");

    // 쿼리가 있으면 검색 결과, 없으면 전체 목록으로 이동
    router.push(
      params.toString() ? `/streams?${params.toString()}` : "/streams"
    );
  };

  return (
    <SearchBar
      placeholder="스트리밍 검색"
      value={sp.get("keyword") || ""}
      onSearch={handleSearch}
      autoFocus={false} // 모바일 UX 고려: 자동 포커스 끔
    />
  );
}
