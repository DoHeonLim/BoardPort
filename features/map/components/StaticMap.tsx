/**
 * File Name : features/map/components/StaticMap.tsx
 * Description : 위치 정보를 보여주는 정적 미니 맵 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.14  임도헌   Created   읽기 전용 지도 및 길찾기 링크 연결
 * 2026.02.15  임도헌   Modified  useKakaoLoader 적용하여 스크립트 미로드 시 크래시 방지
 */

"use client";

import { Map, MapMarker } from "react-kakao-maps-sdk";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";
import {
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface StaticMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
  regionString?: string;
}

/**
 * 정적 지도 뷰어 컴포넌트
 *
 * [기능]
 * 1. 전달받은 위경도 좌표에 마커를 표시하는 읽기 전용 지도를 렌더링
 * 2. 지도 클릭 또는 버튼 클릭 시 카카오맵 길찾기 페이지로 이동
 * 3. 상세 페이지 및 게시글 본문에 삽입되어 위치 정보를 시각화
 */
export default function StaticMap({
  latitude,
  longitude,
  locationName,
  regionString,
}: StaticMapProps) {
  // 스크립트 로드 상태 확인 (상세 페이지 등에서 다이렉트 접속 시 필요)
  const { loading, error } = useKakaoLoader();

  // 카카오맵 길찾기 URL
  const mapLink = `https://map.kakao.com/link/map/${locationName},${latitude},${longitude}`;

  if (loading) {
    return (
      <div className="w-full h-48 sm:h-56 rounded-xl bg-surface-dim border border-border flex items-center justify-center animate-pulse">
        <span className="text-xs text-muted">지도 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-48 sm:h-56 rounded-xl bg-surface-dim border border-border flex items-center justify-center">
        <span className="text-xs text-danger">지도를 불러올 수 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 텍스트 정보 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <MapPinIcon className="size-5 text-brand mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-primary">{locationName}</h3>
            {regionString && (
              <p className="text-xs text-muted mt-0.5">{regionString}</p>
            )}
          </div>
        </div>
        <a
          href={mapLink}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-muted hover:text-brand flex items-center gap-1 bg-surface-dim px-2 py-1 rounded-md transition-colors"
        >
          지도 보기 <ArrowTopRightOnSquareIcon className="size-3" />
        </a>
      </div>

      {/* 지도 영역 */}
      <a
        href={mapLink}
        target="_blank"
        rel="noreferrer"
        className="block w-full h-48 sm:h-56 rounded-xl overflow-hidden border border-border relative group"
      >
        <Map
          center={{ lat: latitude, lng: longitude }}
          style={{ width: "100%", height: "100%" }}
          level={3}
          draggable={false}
          zoomable={false}
          disableDoubleClickZoom={true}
        >
          <MapMarker position={{ lat: latitude, lng: longitude }} />
        </Map>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
      </a>
    </div>
  );
}
