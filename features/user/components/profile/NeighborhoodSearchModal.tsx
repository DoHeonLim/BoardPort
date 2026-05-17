/**
 * File Name : features/user/components/profile/NeighborhoodSearchModal.tsx
 * Description : 동네 이름(동/읍/면) 검색 기반 위치 설정 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.20  임도헌   Created   약속 모달과 구분하기 위해서 동네 설정 모달 생성
 * 2026.02.26  임도헌   Modified  autoFocus 제거
 * 2026.03.22  임도헌   Modified  최근 모달 톤 기준으로 높이와 보더 강도 정리
 * 2026.03.23  임도헌   Modified  데스크톱에서 검색 결과 리스트가 덜 답답하게 보이도록 폭을 한 단계 확장
 * 2026.04.07  임도헌   Modified  모바일에서는 BottomSheet를 사용해 동네 검색 흐름을 하단 시트로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.17  임도헌   Modified  모바일 BottomSheet 검색행을 공용 검색 모달 패턴(입력 내부 CTA)으로 맞춰 줄바꿈/높이 불균형을 정리
 * 2026.04.20  임도헌   Modified  동 이름 단일 검색에서도 누락이 덜 생기도록 카카오 주소 검색 결과 확장과 추가 로딩을 지원
 * 2026.04.26  임도헌   Modified  데스크톱 동네 검색 모달의 dialog 의미와 검색 입력/닫기 버튼 라벨을 보강
 * 2026.04.26  임도헌   Modified  동네 검색 로딩/오류/빈 결과 문구를 사용자 행동 기준으로 정리
 * 2026.05.16  임도헌   Modified  카카오 주소 검색 응답 타입을 명시해 any 제거
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import BottomSheet from "@/components/global/BottomSheet";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";
import type { LocationData } from "@/features/map/types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Props {
  onClose: () => void;
  onSelect: (data: LocationData) => void;
}

interface NeighborhoodSearchResultItem {
  address_name: string;
  region1: string;
  region2: string;
  region3: string;
  x: string;
  y: string;
}

interface KakaoAddressSearchItem {
  address?: {
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
    region_3depth_h_name?: string;
  };
  x: string;
  y: string;
}

interface KakaoPagination {
  hasNextPage?: boolean;
}

const SEARCH_PAGE_SIZE = 30;

/**
 * 카카오 주소 검색 응답의 동네 단위 정규화
 */
function normalizeResults(
  data: KakaoAddressSearchItem[]
): NeighborhoodSearchResultItem[] {
  const uniqueRegions = new Map<string, NeighborhoodSearchResultItem>();

  data.forEach((item) => {
    const addr = item.address;
    if (!addr) return;

    const r1 = addr.region_1depth_name;
    const r2 = addr.region_2depth_name;
    const r3 = addr.region_3depth_h_name || addr.region_3depth_name;
    const fullName = [r1, r2, r3].filter(Boolean).join(" ");

    if (!r1 || !r2 || !r3 || !fullName || uniqueRegions.has(fullName)) return;

    uniqueRegions.set(fullName, {
      address_name: fullName,
      region1: r1,
      region2: r2,
      region3: r3,
      x: item.x,
      y: item.y,
    });
  });

  return Array.from(uniqueRegions.values());
}

/**
 * 추가 로드 결과의 중복 제거 병합
 */
function mergeResults(
  prev: NeighborhoodSearchResultItem[],
  next: NeighborhoodSearchResultItem[]
) {
  const merged = new Map(prev.map((item) => [item.address_name, item]));

  next.forEach((item) => {
    if (!merged.has(item.address_name)) {
      merged.set(item.address_name, item);
    }
  });

  return Array.from(merged.values());
}

/**
 * 동네 검색과 위치 선택 모달
 *
 * [기능]
 * 1. 카카오 주소 검색 기반 동/읍/면 결과 조회
 * 2. 검색 결과 중복 제거와 추가 로드 지원
 * 3. 모바일 BottomSheet / 데스크톱 포털 모달 분기
 * 4. 선택 결과의 프로필 위치 저장 형식 변환
 */
export default function NeighborhoodSearchModal({ onClose, onSelect }: Props) {
  const isMobile = useIsMobile();
  const { loading, error } = useKakaoLoader();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<NeighborhoodSearchResultItem[]>([]);
  // 추가 로드 기준 검색어 상태
  const [activeKeyword, setActiveKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /**
   * 검색 실행과 페이지네이션 상태 동기화
   */
  const runSearch = (page: number, searchKeyword: string) => {
    const trimmedKeyword = searchKeyword.trim();
    if (!trimmedKeyword) return;
    if (loading || !window.kakao?.maps?.services) {
      toast.error("동네 검색을 준비 중이에요. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (page === 1) {
      // 첫 검색 기준어 확정
      setIsSearching(true);
      setActiveKeyword(trimmedKeyword);
    } else {
      setIsLoadingMore(true);
    }

    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(
      trimmedKeyword,
      (
        data: KakaoAddressSearchItem[],
        status: string,
        pagination?: KakaoPagination
      ) => {
        setIsSearching(false);
        setIsLoadingMore(false);

        if (status === window.kakao.maps.services.Status.OK) {
          const normalizedResults = normalizeResults(data);

          setResults((prev) =>
            page === 1 ? normalizedResults : mergeResults(prev, normalizedResults)
          );
          setCurrentPage(page);
          setHasNextPage(Boolean(pagination?.hasNextPage));
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          setHasNextPage(false);
          setCurrentPage(1);
          setActiveKeyword(trimmedKeyword);
          setResults([]);
          if (page > 1) return;

          toast.info(
            "일치하는 동네가 없어요. '동', '읍', '면' 이름으로 검색해보세요."
          );
        } else {
          setHasNextPage(false);
          if (page > 1) {
            toast.error("추가 결과를 불러오지 못했습니다.");
            return;
          }

          toast.error("동네를 검색하지 못했어요. 잠시 후 다시 시도해주세요.");
        }
      },
      {
        page,
        size: SEARCH_PAGE_SIZE,
        analyze_type: window.kakao.maps.services.AnalyzeType.SIMILAR,
      }
    );
  };

  const handleSearch = () => {
    if (!keyword.trim()) return;
    runSearch(1, keyword);
  };

  const handleLoadMore = () => {
    if (!hasNextPage || isSearching || isLoadingMore) return;
    // 입력 중 검색어와 추가 로드 검색어의 혼합 방지
    if (!activeKeyword.trim()) return;
    runSearch(currentPage + 1, activeKeyword);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") handleSearch();
  };

  const handleItemClick = (item: NeighborhoodSearchResultItem) => {
    // 프로필 위치 저장 형식 변환
    onSelect({
      latitude: Number(item.y),
      longitude: Number(item.x),
      locationName: item.address_name,
      region1: item.region1,
      region2: item.region2 || item.region1,
      region3: item.region3,
      regionRange: "GU",
    });
  };

  const searchContent = error ? (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <p className="mb-2 font-bold text-danger">동네 검색을 열지 못했어요</p>
      <p className="text-sm text-muted">네트워크 상태를 확인한 뒤 다시 시도해주세요.</p>
    </div>
  ) : loading ? (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      <div className="mb-4 size-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      <p className="text-sm font-medium text-muted">
        지도 시스템을 준비 중입니다...
      </p>
    </div>
  ) : (
    <>
      <div className="shrink-0 border-b border-border-subtle bg-surface p-4">
        <div className="relative">
          <input
            type="text"
            className="input-primary h-12 w-full bg-surface-dim pl-10 pr-16 text-sm shadow-sm focus:bg-surface"
            placeholder="동, 읍, 면으로 검색 (예: 서초동)"
            aria-label="동네 이름 검색어"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="focus-ring-strong absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand/70"
          >
            {isSearching ? "검색 중" : "검색"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface p-2 scrollbar-hide">
        {results.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">
            {isSearching
              ? "동네 검색 결과를 불러오는 중이에요."
              : activeKeyword
                ? "일치하는 동네가 없어요. 동/읍/면 이름을 조금 더 구체적으로 입력해보세요."
                : "현재 위치한 동네 이름을 입력해 검색해보세요."}
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-1">
              {results.map((item) => (
                <li key={item.address_name}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className="focus-ring-soft group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:border-border/50 hover:bg-surface-dim"
                  >
                    <div className="shrink-0 rounded-full bg-surface-dim p-2 text-muted transition-colors group-hover:text-brand dark:group-hover:text-brand-light">
                      <MapPinIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-primary">
                        {item.address_name}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {hasNextPage ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="focus-ring-soft w-full rounded-xl border border-border-subtle bg-surface-dim px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoadingMore ? "결과를 더 불러오는 중..." : "검색 결과 더 보기"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </>
  );

  // 모달 기본 뼈대
  const modalWrapper = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="neighborhood-search-title"
        className="bg-surface flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border-subtle shadow-2xl sm:max-w-lg"
      >
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface shrink-0">
          <h3 id="neighborhood-search-title" className="font-bold text-primary">
            내 동네 검색
          </h3>
          <button
            onClick={onClose}
            className="focus-ring-soft rounded-full p-1 text-muted hover:text-primary transition-colors"
            aria-label="내 동네 검색 모달 닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open
        title="내 동네 검색"
        description="동, 읍, 면 단위로 검색해 내 동네를 설정합니다."
        onClose={onClose}
        contentClassName="px-0 pb-0"
      >
        {searchContent}
      </BottomSheet>
    );
  }

  return createPortal(modalWrapper(searchContent), document.body);
}
