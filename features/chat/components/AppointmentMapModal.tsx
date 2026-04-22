/**
 * File Name : features/chat/components/AppointmentMapModal.tsx
 * Description : 지도 클릭 시 나타나는 확대 지도 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.20  임도헌   Created   지도 클릭 확대(Zoom/Pan) 지원 모달
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.22  임도헌   Modified  최근 모달 셸 기준에 맞춰 높이 단위와 외곽선/헤더/푸터 보더 강도 정리
 * 2026.04.02  임도헌   Modified  약속 지도 모달 컴포넌트 JSDoc 보강
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";
import {
  XMarkIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  latitude: number;
  longitude: number;
  locationName: string;
}

/**
 * 약속 장소를 확대 지도와 외부 길찾기 링크로 보여주는 모달
 *
 * @param {Props} props - 닫기 핸들러와 약속 장소 좌표/이름 정보
 * @returns {JSX.Element | null} 카카오맵 확대 모달
 */
export default function AppointmentMapModal({
  onClose,
  latitude,
  longitude,
  locationName,
}: Props) {
  const { loading, error } = useKakaoLoader();
  const dialogRef = useRef<HTMLDivElement>(null);

  // 카카오맵 외부 링크 (길찾기 / 길안내)
  const mapLink = `https://map.kakao.com/link/map/${encodeURIComponent(
    locationName
  )},${latitude},${longitude}`;

  // 모달 제어 (ESC 닫기, 스크롤 잠금)
  useEffect(() => {
    lockBodyScroll();

    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (error) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* 배경 클릭 시 닫기 */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-label="약속 장소 상세 지도"
        className={cn(
          "relative w-full max-w-2xl bg-surface shadow-2xl flex flex-col overflow-hidden outline-none",
          "h-[80dvh] sm:h-[70dvh] rounded-3xl border border-border-subtle"
        )}
      >
        {/* 헤더 */}
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-5 py-4">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <MapPinIcon className="size-5 text-brand" />
            약속 장소
          </h3>
          <button
            onClick={onClose}
            className="focus-ring-soft rounded-full p-1 text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* 지도 영역 */}
        <div className="flex-1 relative w-full h-full min-h-0 bg-surface-dim">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="size-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Map
              center={{ lat: latitude, lng: longitude }}
              style={{ width: "100%", height: "100%" }}
              level={3}
              // [UX 핵심] 모달에서는 드래그와 줌이 가능하게 활성화
              draggable={true}
              zoomable={true}
            >
              <MapMarker position={{ lat: latitude, lng: longitude }} />
            </Map>
          )}
        </div>

        {/* 하단 정보 및 액션 */}
        <div className="z-10 shrink-0 border-t border-border-subtle bg-surface p-5">
          <p className="text-base font-bold text-primary mb-4 leading-snug">
            {locationName}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary h-12 text-sm"
            >
              닫기
            </button>
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn-primary h-12 text-sm flex items-center justify-center gap-2"
            >
              <span>길찾기</span>
              <ArrowTopRightOnSquareIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
