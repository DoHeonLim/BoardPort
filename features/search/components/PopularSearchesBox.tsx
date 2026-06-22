/**
 * File Name : features/search/components/PopularSearchesBox.tsx
 * Description : 인기 검색어 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   SearchSection에서 인기 검색 UI 분리
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 (text-muted, hover 스타일)
 * 2026.01.12  임도헌   Modified  검색 기록 없을때 안내 메세지 표시
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.28  임도헌   Modified  장문 인기 검색어가 모바일에서도 자연스럽게 읽히도록 다중 줄 래핑 처리
 * 2026.04.02  임도헌   Modified  인기 검색 타입 import를 search 도메인 공용 타입 기준으로 정리
 * 2026.04.10  임도헌   Modified  검색 타이포 정책에 맞춰 섹션 헤더 weight를 500 기준으로 정리
 * 2026.04.10  임도헌   Modified  상위 검색 모달 클라이언트 경계 아래에서만 사용되도록 use client 중복 선언을 제거
 * 2026.04.17  임도헌   Modified  인기 검색어 링크 렌더링과 빈 상태 처리 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.06.14  임도헌   Modified  인기 검색어 클릭 시 기존 분류/필터 조건을 유지하도록 검색 실행 경로 통일
 */

import Link from "next/link";
import { FireIcon } from "@heroicons/react/24/solid";
import type { PopularSearchItem } from "@/features/search/types";

interface PopularSearchesBoxProps {
  popularSearches: PopularSearchItem[];
  onSearch: (keyword: string) => void;
  basePath: string;
}

/**
 * 서비스 전체 인기 검색어 목록
 *
 * - 인기 키워드를 순위와 함께 링크 형태로 노출
 * - 클릭 시 상위 검색 모달과 동일한 `onSearch` 흐름을 타도록 연결
 * - 데이터가 없으면 빈 상태 문구로 자연스럽게 대체
 */
export default function PopularSearchesBox({
  popularSearches,
  onSearch,
  basePath,
}: PopularSearchesBoxProps) {
  const isEmpty = !popularSearches || popularSearches.length === 0;

  return (
    <div className="flex-1">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted">
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
              key={item.keyword}
              href={`${basePath}?keyword=${encodeURIComponent(item.keyword)}`}
              onClick={(e) => {
                e.preventDefault();
                onSearch(item.keyword);
              }}
              className="focus-ring-soft group -mx-2 flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-surface-dim"
            >
              <span className="mt-0.5 w-5 shrink-0 text-center text-sm font-bold text-brand dark:text-brand-light">
                {index + 1}
              </span>
              <span className="min-w-0 break-all text-sm leading-6 text-primary line-clamp-2 sm:line-clamp-3 group-hover:underline decoration-brand/30 underline-offset-4">
                {item.keyword}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
