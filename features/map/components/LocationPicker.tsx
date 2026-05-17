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
 * 2026.02.26  임도헌   Modified  다크모드 가시성 강화를 위한 brand-light 토큰 적용
 * 2026.02.26  임도헌   Modified  autoFocus 제거
 * 2026.03.07  임도헌   Modified  지도 SDK 로드 실패를 토스트/즉시 종료 대신 모달 내 상태 화면으로 전환
 * 2026.03.12  임도헌   Modified  장소 검색 결과 패널 구분선을 border-border-subtle 기준으로 통일
 * 2026.03.26  임도헌   Modified  선택 위치 카드 높이와 내부 여백을 조정해 모바일 지도 가시 영역을 더 넓게 확보
 * 2026.03.29  임도헌   Modified  모바일은 풀스크린 지도 작업면으로 전환하고 검색/선택 오버레이 위계를 재정렬
 * 2026.03.29  임도헌   Modified  하단 안내 힌트의 blur를 제거하고 확인 CTA를 검색 버튼과 동일한 bg-brand 톤으로 통일
 * 2026.03.29  임도헌   Modified  지도 위 힌트/선택 카드 텍스트 대비를 높여 라이트·다크 가시성 정리
 * 2026.04.02  임도헌   Modified  초기 지도 중심 좌표를 map/constants 공용 상수로 분리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.10  임도헌   Modified  map 타이포 정책에 맞춰 안내 힌트와 선택 위치 라벨 크기/weight를 400·500·700 기준으로 정리
 * 2026.05.16  임도헌   Modified  카카오 장소 검색 결과 타입을 명시해 any 제거
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";
import { MAP_DEFAULT_CENTER } from "@/features/map/constants";
import { toast } from "sonner";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type {
  KakaoPlaceSearchResult,
  LocationData,
} from "@/features/map/types";

interface LocationPickerProps {
  onSelect: (data: LocationData) => void;
  onClose: () => void;
  initialData?: Partial<LocationData>;
}

/**
 * 장소 선택 모달 컴포넌트
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
  // 카카오 지도 스크립트 로드
  const { loading, error: loaderError } = useKakaoLoader();

  // --- States ---
  const [mounted, setMounted] = useState(false);
  const [center, setCenter] = useState(MAP_DEFAULT_CENTER);
  const [keyword, setKeyword] = useState("");
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [selectedInfo, setSelectedInfo] = useState<LocationData | null>(null);
  const [searchResults, setSearchResults] = useState<KakaoPlaceSearchResult[]>(
    []
  );

  // 초기 위치 데이터 연동
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

  // 좌표 -> 주소 변환
  // 선택 좌표를 행정구역 정보로 역지오코딩
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

        // 세종시 등 region2 부재 케이스 보정
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

  // 키워드 검색 실행
  const executeSearch = () => {
    if (!keyword.trim()) return;

    // SDK와 services 라이브러리 로드 여부 동시 확인
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
        setSearchResults(data as KakaoPlaceSearchResult[]);
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
      // 부모 form 제출 차단
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

  const handleResultClick = (rs: KakaoPlaceSearchResult) => {
    const pos = { lat: Number(rs.y), lng: Number(rs.x) };
    setCenter(pos);
    updateLocationInfo(pos, rs.place_name);
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="bg-surface w-full overflow-hidden shadow-2xl flex flex-col h-[100dvh] sm:max-w-2xl sm:h-[80dvh] sm:rounded-3xl border-0 sm:border sm:border-border-subtle">
        {/* 헤더 */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface shrink-0 z-20 relative">
          <h3 className="font-bold text-primary text-lg">거래 장소 선택</h3>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring-soft rounded-full p-2 text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            aria-label="거래 장소 선택 모달 닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* 검색 바 */}
        <div className="p-4 bg-surface border-b border-border-subtle shrink-0 z-20 relative">
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="장소 검색 (예: 사당역, 스타벅스 강남점)"
              className="input-primary w-full pl-11 pr-16 h-12 shadow-sm bg-surface-dim focus:bg-surface"
            />
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted" />
            <button
              type="button"
              onClick={executeSearch}
              className="focus-ring-strong absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
              aria-label="거래 장소 검색 실행"
            >
              검색
            </button>
          </div>
        </div>

        {/* 메인 지도 영역 */}
        <div className="flex-1 relative w-full h-full min-h-0 bg-surface-dim z-0">
          <Map
            center={center}
            style={{ width: "100%", height: "100%" }}
            level={3}
            onClick={handleMapClick}
          >
            {marker && <MapMarker position={marker} />}
          </Map>

          {/* 검색 결과 목록 오버레이 */}
          {searchResults.length > 0 && (
            <div className="absolute inset-x-3 top-3 z-10 max-h-[50%] overflow-hidden rounded-2xl border border-border-subtle bg-surface/98 shadow-2xl backdrop-blur-sm">
              <div className="max-h-[50dvh] divide-y divide-border-subtle overflow-y-auto">
                {searchResults.map((rs, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleResultClick(rs)}
                    className="focus-ring-soft flex w-full flex-col gap-0.5 bg-surface p-4 text-left transition-colors hover:bg-surface-dim active:bg-surface-dim/80"
                  >
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {rs.place_name}
                    </span>
                    <span className="text-xs text-muted">
                      {rs.road_address_name || rs.address_name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!selectedInfo && searchResults.length === 0 && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-sm">
              <div className="rounded-2xl border border-border-subtle bg-surface px-4 py-3 shadow-lg">
                <p className="text-sm font-medium text-primary">
                  지도를 누르거나 검색 결과를 선택하세요.
                </p>
                <p className="mt-1 text-xs text-muted dark:text-slate-300/90">
                  선택한 위치는 상품, 게시글, 약속 장소에 바로 사용할 수
                  있습니다.
                </p>
              </div>
            </div>
          )}

          {/* 선택 정보 및 확인 버튼 (하단 고정) */}
          {selectedInfo && (
            <div className="absolute bottom-3 inset-x-4 z-30 animate-slide-up sm:bottom-4">
              <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-3 shadow-2xl ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light shrink-0">
                    <MapPinIcon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-brand dark:text-brand-light">
                      선택된 위치
                    </p>
                    <p className="font-bold text-primary text-base truncate">
                      {selectedInfo.locationName}
                    </p>
                    <p className="mt-0 text-xs text-muted dark:text-slate-300/90">
                      {selectedInfo.region1} {selectedInfo.region2}{" "}
                      {selectedInfo.region3}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(selectedInfo)}
                  className="focus-ring-strong h-11 w-full rounded-xl bg-brand text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:text-neutral-300"
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
        <div className="bg-surface w-full h-[100dvh] sm:h-auto sm:max-w-md sm:rounded-3xl flex flex-col items-center justify-center gap-4 border-0 sm:border sm:border-border-subtle p-8">
          <div className="size-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-primary">
            지도를 준비하고 있습니다...
          </p>
        </div>
      </div>
    );
  }

  if (loaderError) {
    // SDK 로드 실패 상태 화면 렌더링
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
        <div className="bg-surface w-full h-[100dvh] sm:h-auto sm:max-w-md sm:rounded-3xl border-0 sm:border sm:border-border-subtle shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface">
            <h3 className="font-bold text-primary text-lg">거래 장소 선택</h3>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring-soft rounded-full p-2 text-muted transition-colors hover:bg-surface-dim hover:text-primary"
              aria-label="거래 장소 선택 모달 닫기"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>
          <div className="p-6">
            <div className="state-card max-w-none px-5 py-6">
              <div className="state-icon-wrap">
                <MapPinIcon className="size-8" />
              </div>
              <h4 className="state-title">
                지도 시스템을 불러오지 못했습니다.
              </h4>
              <p className="state-description">
                네트워크 상태를 확인한 뒤 다시 시도해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(modalContent, document.body);
}
