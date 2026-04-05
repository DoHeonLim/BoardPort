/**
 * File Name : components/ui/ZoomableImage.tsx
 * Description : 단일 이미지 미리보기와 공용 확대/축소 모달을 제공하는 이미지 뷰어
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.31  임도헌   Created   게시글 이미지 블록용 단일 이미지 확대/축소 뷰어 추가
 * 2026.03.31  임도헌   Modified  캐러셀과 채팅 이미지도 같은 확대/축소 모달을 재사용하도록 공용 레이어 분리
 */
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import Image from "next/image";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.25;

interface ZoomableImageProps {
  src: string;
  alt: string;
  isAnimated?: boolean;
  className?: string;
}

interface ImageZoomModalProps {
  open: boolean;
  src: string;
  alt: string;
  isAnimated?: boolean;
  onClose: () => void;
}

/**
 * 공용 이미지 확대/축소 모달
 * 게시글 이미지, 캐러셀, 채팅 이미지가 같은 원본 보기 경험을 공유하도록 분리한 레이어.
 */
export function ImageZoomModal({
  open,
  src,
  alt,
  isAnimated = false,
  onClose,
}: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });

  const closeZoom = useCallback(() => {
    onClose();
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsPanning(false);
  }, [onClose]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsPanning(false);
  }, []);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.deltaY < 0) {
      zoomIn();
      return;
    }
    zoomOut();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (scale <= MIN_SCALE) return;

    event.preventDefault();
    panStartRef.current = { x: event.clientX, y: event.clientY };
    panOriginRef.current = { ...translate };
    setIsPanning(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPanning || scale <= MIN_SCALE) return;

    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;

    setTranslate({
      x: panOriginRef.current.x + deltaX,
      y: panOriginRef.current.y + deltaY,
    });
  };

  const handlePointerEnd = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (!open) return;

    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open, closeZoom, zoomIn, zoomOut]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeZoom();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        zoomIn();
        return;
      }
      if (event.key === "-") {
        zoomOut();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeZoom, zoomIn, zoomOut]);

  useEffect(() => {
    if (scale <= MIN_SCALE) {
      setTranslate({ x: 0, y: 0 });
      setIsPanning(false);
    }
  }, [scale]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={closeZoom}
    >
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            zoomOut();
          }}
          className="rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white disabled:opacity-40"
          aria-label="이미지 축소"
          disabled={scale <= MIN_SCALE}
        >
          <MagnifyingGlassMinusIcon className="size-6" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            zoomIn();
          }}
          className="rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white disabled:opacity-40"
          aria-label="이미지 확대"
          disabled={scale >= MAX_SCALE}
        >
          <MagnifyingGlassPlusIcon className="size-6" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            resetZoom();
          }}
          className="rounded-full bg-black/50 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:text-white"
        >
          원본
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeZoom();
          }}
          className="rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white"
          aria-label="이미지 확대 닫기"
        >
          <XMarkIcon className="size-7" />
        </button>
      </div>

      <div
        className="relative h-full max-h-[92vh] w-full max-w-[95vw] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        onWheel={handleWheel}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className={cn(
            "relative h-full w-full",
            scale > MIN_SCALE &&
              (isPanning ? "cursor-grabbing" : "cursor-grab"),
            !isPanning && "transition-transform duration-200 ease-out"
          )}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          }}
          onPointerDown={handlePointerDown}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            draggable={false}
            sizes="100vw"
            priority
            unoptimized={isAnimated}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 단일 이미지 미리보기와 확대/축소 모달
 * 본문 흐름 안에 들어가는 단일 이미지를 자연스럽게 보여주고, 클릭 시 공용 원본 보기로 연결한다.
 */
export default function ZoomableImage({
  src,
  alt,
  isAnimated = false,
  className,
}: ZoomableImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsZoomed(true)}
        className={cn(
          "group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-2xl",
          className
        )}
        aria-label="이미지 크게 보기"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={85}
          unoptimized={isAnimated}
        />
      </button>

      <ImageZoomModal
        open={isZoomed}
        src={src}
        alt={alt}
        isAnimated={isAnimated}
        onClose={() => setIsZoomed(false)}
      />
    </>
  );
}
