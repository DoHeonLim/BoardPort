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
 */
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";

interface Props {
  onSelect: (regionName: string) => void;
  onClose: () => void;
}

export default function RegionSearchModal({ onSelect, onClose }: Props) {
  const { loading, error } = useKakaoLoader();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    if (loading || !window.kakao?.maps?.services) {
      toast.error("검색 시스템을 로딩 중입니다.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        // 행정구역 정보가 있는 결과 위주로 필터링하거나 그대로 노출
        setResults(data);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        toast.info("검색 결과가 없습니다.");
        setResults([]);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") handleSearch();
  };

  // 결과 선택 시 로직: 사용자가 선택한 장소의 행정구역명 추출
  const handleItemClick = (item: any) => {
    // 카카오 검색 결과(item)에서 행정구역명 추출 로직
    // address_name 예시: "부산 금정구 부곡동 737-87"
    const address = item.address_name || "";
    const parts = address.split(" ");

    let targetRegion = "";

    // 사용자가 검색한 키워드가 주소(읍/면/동/구/시)에 포함되어 있다면 그 단어를 최우선으로 사용
    const matchedPart = parts.find((part: string) =>
      part.includes(keyword.trim())
    );

    if (matchedPart) {
      targetRegion = matchedPart;
    }
    // 매칭되는 게 없다면 기존처럼 구/군 단위(parts[1]) 또는 시/도 단위(parts[0])를 사용
    else if (parts.length >= 3) {
      targetRegion = parts[2]; // 기본적으로 동/읍/면 우선
    } else if (parts.length === 2) {
      targetRegion = parts[1]; // 구/군
    } else {
      targetRegion = parts[0] || item.place_name;
    }

    onSelect(targetRegion);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border animate-fade-in flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <h3 className="font-bold text-primary">다른 지역 검색</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary"
            aria-label="지역 검색 모달 닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {loading || error ? (
          <div className="flex-1 bg-surface p-6">
            <div className="state-card max-w-none px-5 py-6">
              <div className="state-icon-wrap">
                <MapPinIcon className="size-8" />
              </div>
              <h4 className="state-title">
                {loading ? "지역 검색을 준비하고 있습니다." : "지역 검색을 불러오지 못했습니다."}
              </h4>
              <p className="state-description">
                {loading
                  ? "카카오 지도 SDK를 불러오는 중입니다. 잠시 후 다시 시도해주세요."
                  : "네트워크 상태를 확인한 뒤 다시 시도해주세요."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Input */}
            <div className="p-4 bg-surface-dim border-b border-border shrink-0">
              <div className="relative">
                <input
                  type="text"
                  className="input-primary pl-10 bg-surface"
                  placeholder="예: 강남구, 부산, 해운대"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted" />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-brand text-white text-xs rounded-md font-bold"
                  aria-label="지역 검색 실행"
                >
                  검색
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto bg-surface p-2">
              {results.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">
                  지역명이나 장소를 검색해주세요.
                </div>
              ) : (
                <ul className="space-y-1">
                  {results.map((item, i) => (
                    <li key={i}>
                      <button
                        onClick={() => handleItemClick(item)}
                        className="w-full text-left p-3 rounded-xl hover:bg-surface-dim transition-colors flex items-start gap-3"
                      >
                        <MapPinIcon className="size-5 text-muted mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-primary">
                            {item.place_name}
                          </div>
                          <div className="text-xs text-muted mt-0.5">
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
        )}
      </div>
    </div>,
    document.body
  );
}
