/**
 * File Name : features/search/components/RegionSearchModal.tsx
 * Description : 다른 지역 검색을 위한 모달 (Kakao Local API 활용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.15  임도헌   Created   타 지역 검색 및 행정구역명 추출 로직 구현
 * 2026.02.26  임도헌   Modified  autoFocus 제거
 * 2026.03.07  임도헌   Modified  지도 SDK 로딩/오류 시 모달 내 상태 화면을 제공하고 닫기 접근성을 보강
 * 2026.03.22  임도헌   Modified  최근 모달 톤 기준으로 높이와 보더 강도 정리
 * 2026.03.23  임도헌   Modified  데스크톱에서 검색 결과 리스트가 덜 답답하게 보이도록 폭을 한 단계 확장
 * 2026.04.02  임도헌   Modified  카카오 장소 검색 결과 타입을 search 도메인 공용 타입 기준으로 정리
 * 2026.04.07  임도헌   Modified  모바일에서는 BottomSheet를 사용해 지역 검색 흐름을 하단 시트로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.26  임도헌   Modified  데스크톱 지역 검색 모달의 dialog 의미와 검색 입력 라벨을 보강
 * 2026.04.26  임도헌   Modified  지역 검색 로딩/빈 결과 안내 문구를 사용자 행동 기준으로 정리
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
import type { RegionSearchResultItem } from "@/features/search/types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Props {
  onSelect: (regionName: string) => void;
  onClose: () => void;
}

/**
 * 지역 검색 결과를 선택해 상위 검색 컨텍스트에 전달하는 모달
 * - 카카오 장소 검색 결과를 목록으로 표시
 * - 선택한 장소명에서 우선 적용할 행정구역 키워드를 추출
 */
export default function RegionSearchModal({ onSelect, onClose }: Props) {
  const isMobile = useIsMobile();
  const { loading, error } = useKakaoLoader();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<RegionSearchResultItem[]>([]);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    if (loading || !window.kakao?.maps?.services) {
      toast.error("지역 검색을 준비 중이에요. 잠시 후 다시 시도해주세요.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        // 행정구역 정보가 있는 결과 위주로 필터링하거나 그대로 노출
        setResults(data);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        toast.info("일치하는 지역이나 장소가 없어요.");
        setResults([]);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") handleSearch();
  };

  // 결과 선택 시 로직: 사용자가 선택한 장소의 행정구역명 추출
  const handleItemClick = (item: RegionSearchResultItem) => {
    // 카카오 검색 결과(item)에서 행정구역명 추출 로직
    // address_name 예시: "부산 금정구 부곡동 737-87"
    const address = item.address_name || "";
    const parts = address.split(" ");

    let targetRegion = "";

    // 사용자가 검색한 키워드가 주소(읍/면/동/구/시)에 포함된 경우 해당 단어 최우선 사용
    const matchedPart = parts.find((part: string) =>
      part.includes(keyword.trim())
    );

    if (matchedPart) {
      targetRegion = matchedPart;
    }
    // 매칭되는 값이 없는 경우 기존과 같은 구/군 단위(parts[1]) 또는 시/도 단위(parts[0]) 사용
    else if (parts.length >= 3) {
      targetRegion = parts[2]; // 기본적으로 동/읍/면 우선
    } else if (parts.length === 2) {
      targetRegion = parts[1]; // 구/군
    } else {
      targetRegion = parts[0] || item.place_name;
    }

    onSelect(targetRegion);
  };

  const searchContent =
    loading || error ? (
      <div className="flex-1 bg-surface p-6">
        <div className="state-card max-w-none px-5 py-6">
          <div className="state-icon-wrap">
            <MapPinIcon className="size-8" />
          </div>
          <h4 className="state-title">
            {loading
              ? "지역 검색을 준비하고 있습니다."
              : "지역 검색을 불러오지 못했습니다."}
          </h4>
          <p className="state-description">
            {loading
              ? "지역 검색을 준비 중이에요. 잠시 후 다시 시도해주세요."
              : "네트워크 상태를 확인한 뒤 다시 시도해주세요."}
          </p>
        </div>
      </div>
    ) : (
      <>
        <div className="shrink-0 border-b border-border-subtle bg-surface-dim p-4">
          <div className="relative">
            <input
              type="text"
              className="input-primary bg-surface pl-10"
              placeholder="예: 강남구, 부산, 해운대"
              aria-label="지역 검색어"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <button
              onClick={handleSearch}
              className="focus-ring-strong absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-brand px-3 py-1 text-xs font-bold text-white"
              aria-label="지역 검색 실행"
            >
              검색
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-surface p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">
              지역명이나 장소 이름을 입력해 검색해보세요.
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((item, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className="focus-ring-soft flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-surface-dim"
                  >
                    <MapPinIcon className="mt-0.5 size-5 shrink-0 text-muted" />
                    <div>
                      <div className="text-sm font-bold text-primary">
                        {item.place_name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {item.address_name}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );

  if (isMobile) {
    return (
      <BottomSheet
        open
        title="다른 지역 검색"
        description="지역명이나 장소를 검색해 다른 지역 결과로 이동합니다."
        onClose={onClose}
        contentClassName="px-0 pb-0"
      >
        {searchContent}
      </BottomSheet>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-search-title"
        className="bg-surface flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border-subtle shadow-2xl sm:max-w-lg"
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface shrink-0">
          <h3 id="region-search-title" className="font-bold text-primary">
            다른 지역 검색
          </h3>
          <button
            onClick={onClose}
            className="focus-ring-soft rounded p-1 text-muted hover:text-primary"
            aria-label="지역 검색 모달 닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {searchContent}
      </div>
    </div>,
    document.body
  );
}
