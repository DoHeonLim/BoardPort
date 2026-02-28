/**
 * File Name : features/user/components/profile/NeighborhoodSearchModal.tsx
 * Description : 동네 이름(동/읍/면) 검색 기반 위치 설정 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.20  임도헌   Created   약속 모달과 구분하기 위해서 동네 설정 모달 생성
 * 2026.02.26  임도헌   Modified  autoFocus 제거
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
import type { LocationData } from "@/features/map/types";

interface Props {
  onClose: () => void;
  onSelect: (data: LocationData) => void;
}

export default function NeighborhoodSearchModal({ onClose, onSelect }: Props) {
  const { loading, error } = useKakaoLoader();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (!keyword.trim()) return;

    if (loading || !window.kakao?.maps?.services) {
      toast.error("지도 시스템을 로딩 중입니다. 잠시 후 시도해주세요.");
      return;
    }

    // Places(장소) 대신 Geocoder(주소) API 사용
    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(keyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        // 결과 중복 제거 (예: "부산 금정구 부곡동"이 지번별로 여러 개 나오는 것 방지)
        const uniqueRegions = new Map();

        data.forEach((item: any) => {
          const addr = item.address;
          if (!addr) return;

          // 행정동(h_name) 우선, 없으면 법정동 사용
          const r1 = addr.region_1depth_name; // 시/도
          const r2 = addr.region_2depth_name; // 구/군
          const r3 = addr.region_3depth_h_name || addr.region_3depth_name; // 동/읍/면

          const fullName = [r1, r2, r3].filter(Boolean).join(" ");

          // Map을 이용해 이름이 같은 구역은 1개만 저장
          if (!uniqueRegions.has(fullName)) {
            uniqueRegions.set(fullName, {
              address_name: fullName,
              region1: r1,
              region2: r2,
              region3: r3,
              x: item.x,
              y: item.y,
            });
          }
        });

        setResults(Array.from(uniqueRegions.values()));
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        toast.info(
          "검색 결과가 없습니다. '동', '읍', '면' 단위로 검색해보세요."
        );
        setResults([]);
      } else {
        toast.error("검색 중 오류가 발생했습니다.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") handleSearch();
  };

  const handleItemClick = (item: any) => {
    // 이미 addressSearch에서 필터링된 깔끔한 데이터이므로 그대로 전달
    onSelect({
      latitude: Number(item.y),
      longitude: Number(item.x),
      locationName: item.address_name,
      region1: item.region1,
      // 세종시 등 구/군이 없는 경우 시/도를 복제하여 필터 에러 방지
      region2: item.region2 || item.region1,
      region3: item.region3,
      regionRange: "GU", // 내 동네 신규 설정 시 기본 범위는 '보통(구 단위)'
    });
  };

  // 모달 기본 뼈대
  const modalWrapper = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border animate-fade-in flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <h3 className="font-bold text-primary">내 동네 검색</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );

  if (error) {
    return createPortal(
      modalWrapper(
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-danger font-bold mb-2">시스템 로드 실패</p>
          <p className="text-sm text-muted">네트워크 상태를 확인해주세요.</p>
        </div>
      ),
      document.body
    );
  }

  if (loading) {
    return createPortal(
      modalWrapper(
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="size-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted font-medium">
            지도 시스템을 준비 중입니다...
          </p>
        </div>
      ),
      document.body
    );
  }

  return createPortal(
    modalWrapper(
      <>
        {/* Input */}
        <div className="p-4 bg-surface-dim border-b border-border shrink-0">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                className="input-primary pl-10 w-full bg-surface text-sm"
                placeholder="동, 읍, 면으로 검색 (예: 서초동)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted pointer-events-none" />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-brand text-white text-sm rounded-xl font-bold hover:bg-brand-dark transition-colors shrink-0 shadow-sm"
            >
              검색
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-surface p-2 scrollbar-hide">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">
              현재 위치한 동네 이름을 검색해주세요.
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((item, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className="w-full text-left p-3 rounded-xl hover:bg-surface-dim transition-colors flex items-center gap-3 border border-transparent hover:border-border/50"
                  >
                    <div className="p-2 bg-surface-dim rounded-full text-muted shrink-0 group-hover:text-brand transition-colors">
                      <MapPinIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* 주소 문자열만 깔끔하게 노출 */}
                      <div className="text-sm font-bold text-primary truncate">
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
    ),
    document.body
  );
}
