/**
 * File Name : components/search/PopularSearchesBox
 * Description : 인기 검색어 목록 컴포넌트 (PC 및 모바일 공통)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   SearchSection에서 인기 검색 UI 분리
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 (text-muted, hover 스타일)
 * 2026.01.12  임도헌   Modified  검색 기록 없을때 안내 메세지 표시
 */
"use client";

import { FireIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

interface PopularSearchesBoxProps {
  popularSearches: { keyword: string; count: number }[];
  onSearch: (keyword: string) => void;
  basePath: string;
}

export default function PopularSearchesBox({
  popularSearches,
  onSearch,
  basePath,
}: PopularSearchesBoxProps) {
  const isEmpty = !popularSearches || popularSearches.length === 0;

  return (
    <div className="flex-1">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted mb-3">
        <FireIcon className="size-4 text-orange-500" />
        인기 검색어
      </h3>

      {isEmpty ? (
        <div className="py-4 text-center text-sm text-muted/60 bg-surface-dim/30 rounded-lg">
          아직 인기 검색어가 없습니다.
        </div>
      ) : (
        <div className="space-y-1">
          {popularSearches.map((item, index) => (
            <Link
              key={index}
              href={`${basePath}?keyword=${encodeURIComponent(item.keyword)}`}
              onClick={() => onSearch(item.keyword)}
              className="flex items-center gap-2 group p-2 -mx-2 rounded-lg hover:bg-surface-dim transition-colors"
            >
              <span className="w-5 text-center text-sm font-bold text-brand dark:text-brand-light">
                {index + 1}
              </span>
              <span className="text-sm text-primary group-hover:underline decoration-brand/30 underline-offset-4">
                {item.keyword}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
