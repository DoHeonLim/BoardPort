/**
 * File Name : features/chat/components/AppointmentMapModal.tsx
 * Description : 지도 클릭 시 나타나는 확대 지도 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.20  임도헌   Created   지도 클릭 확대(Zoom/Pan) 지원 모달
 */
"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";
import {
  XMarkIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  latitude: number;
  longitude: number;
  locationName: string;
}

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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (error) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Background Click to Close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-label="약속 장소 상세 지도"
        className={cn(
          "relative w-full max-w-2xl bg-surface shadow-2xl flex flex-col overflow-hidden outline-none animate-fade-in",
          "h-[80vh] sm:h-[70vh] rounded-3xl border border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0 z-10">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <MapPinIcon className="size-5 text-brand" />
            약속 장소
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Map Area */}
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

        {/* Footer Info & Action */}
        <div className="p-5 border-t border-border bg-surface shrink-0 z-10">
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
              rel="noreferrer"
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
