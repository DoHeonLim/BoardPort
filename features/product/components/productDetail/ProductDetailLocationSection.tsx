/**
 * File Name : features/product/components/productDetail/ProductDetailLocationSection.tsx
 * Description : 제품 상세의 거래 장소 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.14  임도헌   Created   카카오 지도 SDK를 사용자 액션 이후에만 불러오는 지연 로딩 위치 섹션 분리
 * 2026.04.14  임도헌   Modified  위치 미리보기 썸네일과 UX 문구를 보강하고 데스크톱은 뷰포트 진입 시 지도를 여유 시간에 자동 선로딩
 * 2026.04.14  임도헌   Modified  모바일도 위치 섹션 진입 시 실제 지도를 자동 준비하도록 조정해 미리보기 경험 보강
 * 2026.04.14  임도헌   Modified  지도 섹션의 지연 준비 전략과 사용자 흐름이 드러나도록 함수 상단 JSDoc 설명을 보강
 * 2026.04.14  임도헌   Modified  자동 로드 정책에 맞춰 미리보기 카드를 정보 중심의 간소한 로딩 셸로 정리
 * 2026.04.26  임도헌   Modified  지도 열기 CTA의 다크모드 색조를 primary CTA 톤과 맞춰 정리
 * 2026.06.18  임도헌   Modified  정규화된 지역 표시 포맷을 사용해 중복 지역명 노출 방지
 */

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { formatNormalizedRegion } from "@/features/map/utils/normalizeRegion";

const loadStaticMap = () => import("@/features/map/components/StaticMap");

const StaticMap = dynamic(loadStaticMap, {
  ssr: false,
});

interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
}

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface ProductDetailLocationSectionProps {
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  region1: string | null;
  region2: string | null;
  region3: string | null;
}

/**
 * 거래 위치를 보여주되 지도 비용은 늦춰 불러오는 상세 위치 섹션.
 * 초기 진입에서는 장소 정보와 준비 상태만 보여주고, 섹션이 뷰포트에 가까워지면
 * 네트워크 상태를 보고 실제 지도 준비를 시작해 사용성은 유지하면서도 초기 상세 비용은 눌러둔다.
 */
export default function ProductDetailLocationSection({
  latitude,
  longitude,
  locationName,
  region1,
  region2,
  region3,
}: ProductDetailLocationSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [willAutoOpenMap, setWillAutoOpenMap] = useState(false);
  const hasLocationData = !!latitude && !!longitude && !!locationName;

  useEffect(() => {
    if (!hasLocationData) return;
    if (typeof window === "undefined" || !sectionRef.current || isNearViewport) {
      return;
    }

    // 화면 근접 시에만 후속 로딩 후보 등록, 불필요한 지도 비용 회피
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [hasLocationData, isNearViewport]);

  useEffect(() => {
    if (!hasLocationData) return;
    if (typeof window === "undefined" || shouldLoadMap || !isNearViewport) {
      return;
    }

    const navigatorWithConnection = navigator as NavigatorWithConnection;
    const connection =
      navigatorWithConnection.connection ??
      navigatorWithConnection.mozConnection ??
      navigatorWithConnection.webkitConnection;
    const shouldAvoidAutoOpen =
      connection?.saveData === true ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g";

    if (shouldAvoidAutoOpen) return;

    setWillAutoOpenMap(true);

    const idleWindow = window as WindowWithIdleCallback;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const openMapWhenIdle = () => {
      void loadStaticMap();
      setShouldLoadMap(true);
    };

    // 데스크톱은 여유 시간, 모바일은 섹션 진입 직후의 빠른 지도 준비
    if (desktopQuery.matches && idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(openMapWhenIdle, {
        timeout: 1200,
      });
    } else {
      timeoutId = window.setTimeout(
        openMapWhenIdle,
        desktopQuery.matches ? 700 : 180
      );
    }

    return () => {
      setWillAutoOpenMap(false);
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [hasLocationData, isNearViewport, shouldLoadMap]);

  useEffect(() => {
    if (!shouldLoadMap) return;
    setWillAutoOpenMap(false);
  }, [shouldLoadMap]);

  if (!hasLocationData) {
    return null;
  }

  const regionString = formatNormalizedRegion({ region1, region2, region3 });
  const mapLink = `https://map.kakao.com/link/map/${encodeURIComponent(
    locationName
  )},${latitude},${longitude}`;

  return (
    <section
      ref={sectionRef}
      className="mt-2 border-t border-border-subtle py-2 pt-6"
    >
      <h2 className="mb-3 text-sm font-bold text-primary">직거래 희망 장소</h2>

      {shouldLoadMap ? (
        <StaticMap
          latitude={latitude}
          longitude={longitude}
          locationName={locationName}
          regionString={regionString}
        />
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm"
          onMouseEnter={() => void loadStaticMap()}
          onFocus={() => void loadStaticMap()}
        >
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

          <div className="flex h-48 flex-col items-center justify-center gap-4 bg-surface-dim/55 px-4 py-5 text-center sm:h-56">
            <div className="rounded-full bg-brand/10 p-3 text-brand dark:bg-brand-light/10 dark:text-brand-light">
              <MapPinIcon className="size-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">
                {willAutoOpenMap
                  ? "지도를 준비하고 있어요."
                  : "위치 정보를 먼저 확인할 수 있어요."}
              </p>
              <p className="text-xs text-muted">
                {willAutoOpenMap
                  ? "화면에 보이는 동안 실제 지도를 자동으로 불러옵니다."
                  : "원하면 지금 바로 지도를 열어볼 수 있어요."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShouldLoadMap(true)}
                className="focus-ring-strong inline-flex min-h-10 items-center rounded-lg bg-brand px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
              >
                {willAutoOpenMap ? "지금 지도 먼저 보기" : "상세 지도 열기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
