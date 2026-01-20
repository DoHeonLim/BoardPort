/**
 * File Name : features/search/components/SearchHistoryBox.tsx
 * Description : 최근 검색어 목록 컴포넌트 (PC 및 모바일 공통)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   SearchSection에서 최근 검색 UI 분리
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 삭제 버튼 가시성 개선
 * 2026.01.12  임도헌   Modified  검색 기록 없을때 안내 메세지 표시
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 */

"use client";

import Link from "next/link";
import { XMarkIcon, ClockIcon, TrashIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface SearchHistoryBoxProps {
  history: { keyword: string; created_at: Date }[];
  onSearch: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClear: () => void;
  basePath: string;
  isMobile?: boolean;
}

export default function SearchHistoryBox({
  history,
  onSearch,
  onRemove,
  onClear,
  basePath,
  isMobile = false,
}: SearchHistoryBoxProps) {
  const isEmpty = !history || history.length === 0;

  return (
    <div className={cn("flex flex-col w-full", isMobile ? "px-0" : "p-0")}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted">
          <ClockIcon className="size-4" />
          최근 검색어
        </h3>
        {!isEmpty && (
          <button
            onClick={onClear}
            className="text-xs text-muted hover:text-danger flex items-center gap-1 transition-colors"
          >
            <TrashIcon className="size-3" />
            전체 삭제
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="py-4 text-center text-sm text-muted/60 bg-surface-dim/30 rounded-lg">
          최근 검색 기록이 없습니다.
        </div>
      ) : (
        <div
          className={cn(
            "flex gap-2",
            // 모바일: 가로 스크롤, 패딩 추가하여 짤림 방지
            isMobile
              ? "flex-nowrap overflow-x-auto pb-2 scrollbar-hide w-full"
              : "flex-wrap"
          )}
        >
          {history.map((item, index) => (
            <div
              key={index}
              className="group relative flex items-center shrink-0"
            >
              <Link
                href={`${basePath}?keyword=${encodeURIComponent(item.keyword)}`}
                onClick={() => onSearch(item.keyword)}
                className={cn(
                  "px-3 py-1.5 text-sm bg-surface-dim text-primary rounded-lg hover:bg-border transition-colors pr-7 border border-transparent",
                  "whitespace-nowrap"
                )}
              >
                {item.keyword}
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(item.keyword);
                }}
                className="absolute right-1 p-1 text-muted hover:text-danger rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label={`${item.keyword} 삭제`}
              >
                <XMarkIcon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
