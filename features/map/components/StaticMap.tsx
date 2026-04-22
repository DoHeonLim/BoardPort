/**
 * File Name : features/map/components/StaticMap.tsx
 * Description : 위치 정보를 보여주는 정적 미니 맵 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.14  임도헌   Created   읽기 전용 지도 및 길찾기 링크 연결
 * 2026.02.15  임도헌   Modified  useKakaoLoader 적용하여 스크립트 미로드 시 크래시 방지
 * 2026.02.26  임도헌   Modified  지도 마커 및 헤더 텍스트 찌그러짐 픽스
 * 2026.03.07  임도헌   Modified  외부 지도 링크의 장소명을 URL 인코딩하여 특수문자/공백 깨짐 방지
 * 2026.03.23  임도헌   Modified  정적 지도 로딩/오류/뷰어 셸 보더를 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.29  임도헌   Modified  위치 메타와 외부 지도 액션을 하나의 카드 셸로 통합해 상세 문법과 정합성 보강
 * 2026.04.14  임도헌   Modified  지도 전체를 링크로 감싸지 않고 외부 이동 액션을 분리해 접근성 이름 충돌 가능성을 줄임
 */

"use client";

import { useEffect, useRef } from "react";
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // 스크립트 로드 상태 확인 (상세 페이지 등에서 다이렉트 접속 시 필요)
  const { loading, error } = useKakaoLoader();

  // 카카오맵 길찾기 URL
  const mapLink = `https://map.kakao.com/link/map/${encodeURIComponent(
    locationName
  )},${latitude},${longitude}`;

  useEffect(() => {
    const mapContainer = mapContainerRef.current;

    if (!mapContainer) {
      return;
    }

    /**
     * 카카오맵이 주입하는 일부 `area[role="presentation"]` 마크업은
     * Lighthouse에서 허용되지 않은 role 조합으로 감지될 수 있어 읽기 전용 뷰 기준으로 정리
     */
    const sanitizeMapDom = () => {
      mapContainer
        .querySelectorAll<HTMLAreaElement>('area[role="presentation"]')
        .forEach((areaElement) => {
          areaElement.removeAttribute("role");
        });
    };

    sanitizeMapDom();

    const observer = new MutationObserver(() => {
      sanitizeMapDom();
    });

    observer.observe(mapContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role"],
    });

    return () => observer.disconnect();
  }, [loading, error]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light shrink-0">
              <MapPinIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary">위치 정보</p>
              <p className="text-xs text-muted">지도를 준비하고 있습니다.</p>
            </div>
          </div>
        </div>
        <div className="flex h-48 items-center justify-center bg-surface-dim animate-pulse sm:h-56">
          <span className="text-xs text-muted">지도 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light shrink-0">
              <MapPinIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary">위치 정보</p>
              <p className="text-xs text-muted">지도를 불러올 수 없습니다.</p>
            </div>
          </div>
        </div>
        <div className="flex h-48 items-center justify-center bg-surface-dim sm:h-56">
          <span className="text-xs text-danger">
            네트워크 상태를 확인해주세요.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-full bg-brand/10 p-2 text-brand dark:bg-brand-light/10 dark:text-brand-light shrink-0">
            <MapPinIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-primary break-words leading-snug">
              {locationName}
            </p>
            {regionString && (
              <p className="mt-0.5 text-xs text-muted break-words">
                {regionString}
              </p>
            )}
          </div>
        </div>
        <a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring-soft inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border-subtle bg-surface-dim/70 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-surface-dim hover:text-brand dark:hover:text-brand-light"
        >
          카카오맵 <ArrowTopRightOnSquareIcon className="size-3" />
        </a>
      </div>

      <div
        ref={mapContainerRef}
        className="relative h-48 w-full overflow-hidden sm:h-56"
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

        <div className="pointer-events-none absolute inset-0 bg-black/0" />
      </div>
    </div>
  );
}
