/**
 * File Name : features/map/components/LocationPicker.tsx
 * Description : 카카오 맵 기반 장소 검색 및 선택 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.14  임도헌   Created   검색, 마커 표시, 역지오코딩 기능 구현
 * 2026.02.15  임도헌   Modified  useKakaoLoader 적용 및 폼 중첩 이슈(새로고침) 해결
 * 2026.02.15  임도헌   Modified  services 객체 로드 지연 방어 로직 추가
 * 2026.02.15  임도헌   Modified  createPortal 적용으로 Z-Index/Stacking Context 문제 해결
 */

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";
import { toast } from "sonner";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { LocationData } from "@/features/map/types";

interface LocationPickerProps {
  onSelect: (data: LocationData) => void;
  onClose: () => void;
  initialData?: Partial<LocationData>;
}

/**
 * 장소 선택 모달 컴포넌트
 *
 * [기능]
 * 1. Kakao Maps SDK를 로드하고 키워드 검색 및 마커 이동 기능을 제공
 * 2. 선택된 좌표(위경도)를 주소(행정구역)로 변환(역지오코딩)하여 반환
 * 3. Portal을 사용하여 상위 요소의 스타일 제약 없이 전체 화면을 덮는 모달을 렌더링
 *
 * @param onSelect - 위치 선택 완료 시 호출되는 콜백 (LocationData 반환)
 * @param onClose - 모달 닫기 콜백
 * @param initialData - 초기 위치 데이터 (수정 모드 시 사용)
 */
export default function LocationPicker({
  onSelect,
  onClose,
  initialData,
}: LocationPickerProps) {
  // 1. 카카오 맵 스크립트 로드
  const { loading, error: loaderError } = useKakaoLoader();

  // --- States ---
  const [mounted, setMounted] = useState(false);
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.978 });
  const [keyword, setKeyword] = useState("");
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [selectedInfo, setSelectedInfo] = useState<LocationData | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // 2. 초기 데이터 연동
  useEffect(() => {
    setMounted(true);
    if (initialData?.latitude && initialData?.longitude) {
      const pos = { lat: initialData.latitude, lng: initialData.longitude };
      setCenter(pos);
      setMarker(pos);
      if (initialData.locationName) {
        setSelectedInfo(initialData as LocationData);
      }
    }
  }, [initialData]);

  // 3. 좌표 -> 주소 변환 (역지오코딩)
  const updateLocationInfo = (
    coords: { lat: number; lng: number },
    placeName?: string
  ) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services)
      return;

    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.coord2Address(coords.lng, coords.lat, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const addr = result[0].address;

        // (예외 처리)세종시처럼 구/군(2depth)이 없는 경우 1depth(시/도)를 region2로 복제하여 필터링 오류 방지
        const region2Safe = addr.region_2depth_name || addr.region_1depth_name;

        const info: LocationData = {
          latitude: coords.lat,
          longitude: coords.lng,
          locationName:
            placeName || addr.region_3depth_name || addr.address_name,
          region1: addr.region_1depth_name,
          region2: region2Safe,
          region3: addr.region_3depth_name,
        };
        setMarker(coords);
        setSelectedInfo(info);
        setSearchResults([]);
      } else {
        toast.error("이 위치의 주소를 가져올 수 없습니다.");
      }
    });
  };

  // 4. 키워드 검색 실행
  const executeSearch = () => {
    if (!keyword.trim()) return;

    // SDK 로드 여부 + services 라이브러리 로드 여부 동시 체크
    if (
      loading ||
      !window.kakao ||
      !window.kakao.maps ||
      !window.kakao.maps.services
    ) {
      toast.error("지도를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(keyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setSearchResults(data);
        const first = data[0];
        setCenter({ lat: Number(first.y), lng: Number(first.x) });
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        toast.info("검색 결과가 없습니다.");
        setSearchResults([]);
      } else {
        toast.error("검색 중 오류가 발생했습니다.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 한글 IME 입력 중 Enter 중복 이벤트 방지
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      // 부모 Form(ProductForm, PostForm 등)이 제출되는 것을 완벽히 차단
      e.preventDefault();
      e.stopPropagation();
      executeSearch();
    }
  };

  const handleMapClick = (
    _t: kakao.maps.Map,
    mouseEvent: kakao.maps.event.MouseEvent
  ) => {
    const coords = {
      lat: mouseEvent.latLng.getLat(),
      lng: mouseEvent.latLng.getLng(),
    };
    updateLocationInfo(coords, undefined);
  };

  const handleResultClick = (rs: any) => {
    const pos = { lat: Number(rs.y), lng: Number(rs.x) };
    setCenter(pos);
    updateLocationInfo(pos, rs.place_name);
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] animate-fade-in border border-border">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface shrink-0 z-20 relative">
          <h3 className="font-bold text-primary text-lg">거래 장소 선택</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted hover:text-primary rounded-full hover:bg-surface-dim transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-surface border-b border-border shrink-0 z-20 relative">
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="장소 검색 (예: 사당역, 스타벅스 강남점)"
              className="input-primary w-full pl-11 pr-16 h-12 shadow-sm bg-surface-dim focus:bg-surface"
              autoFocus
            />
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
            <button
              type="button"
              onClick={executeSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark transition-colors"
            >
              검색
            </button>
          </div>
        </div>

        {/* Main Map Container */}
        <div className="flex-1 relative w-full h-full min-h-0 bg-surface-dim z-0">
          <Map
            center={center}
            style={{ width: "100%", height: "100%" }}
            level={3}
            onClick={handleMapClick}
          >
            {marker && <MapMarker position={marker} />}
          </Map>

          {/* Search Results List Overlay */}
          {/* [UI Fix] 배경색을 bg-surface로 고정하여 지도 위에서 텍스트 가독성 확보 */}
          {searchResults.length > 0 && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-surface max-h-[50%] overflow-y-auto border-b border-border shadow-xl divide-y divide-border">
              {searchResults.map((rs, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleResultClick(rs)}
                  className="w-full text-left p-4 hover:bg-surface-dim transition-colors flex flex-col gap-0.5 active:bg-surface-dim/80"
                >
                  <span className="text-sm font-bold text-primary">
                    {rs.place_name}
                  </span>
                  <span className="text-xs text-muted">
                    {rs.road_address_name || rs.address_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Selected Info & Confirm Button (Bottom Floating) */}
          {selectedInfo && (
            <div className="absolute bottom-6 inset-x-4 z-30 animate-slide-up">
              <div className="bg-surface p-4 rounded-2xl shadow-2xl border border-border flex flex-col gap-3 ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-brand/10 rounded-full text-brand shrink-0">
                    <MapPinIcon className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-brand uppercase tracking-wider mb-0.5">
                      선택된 위치
                    </p>
                    <p className="font-bold text-primary text-lg truncate">
                      {selectedInfo.locationName}
                    </p>
                    <p className="text-sm text-muted mt-0.5">
                      {selectedInfo.region1} {selectedInfo.region2}{" "}
                      {selectedInfo.region3}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(selectedInfo)}
                  className="btn-primary w-full h-12 text-base font-bold shadow-lg"
                >
                  이 위치로 설정하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface p-8 rounded-3xl flex flex-col items-center gap-4">
          <div className="size-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-primary">
            지도를 준비하고 있습니다...
          </p>
        </div>
      </div>
    );
  }

  if (loaderError) {
    toast.error("지도 시스템을 로드하지 못했습니다.");
    onClose();
    return null;
  }

  return createPortal(modalContent, document.body);
}
