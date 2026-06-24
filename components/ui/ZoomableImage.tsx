/**
 * File Name : components/ui/ZoomableImage.tsx
 * Description : 단일 이미지 미리보기와 공용 확대/축소 모달을 제공하는 이미지 뷰어
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.31  임도헌   Created   게시글 이미지 블록용 단일 이미지 확대/축소 뷰어 추가
 * 2026.03.31  임도헌   Modified  캐러셀과 채팅 이미지도 같은 확대/축소 모달을 재사용하도록 공용 레이어 분리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 원본 버튼 weight를 500 기준으로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.14  임도헌   Modified  게시글 상세 첫 이미지의 priority/fetchPriority/sizes 주입을 받을 수 있도록 미리보기 이미지 옵션 확장
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
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
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "lazy" | "eager";
  sizes?: string;
  quality?: number;
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const pinchDistanceRef = useRef<number | null>(null);
  const pinchScaleOriginRef = useRef(MIN_SCALE);

  const clampTranslate = useCallback(
    (nextTranslate: { x: number; y: number }, nextScale: number) => {
      const viewport = viewportRef.current;
      if (!viewport || nextScale <= MIN_SCALE) {
        return { x: 0, y: 0 };
      }

      const maxOffsetX =
        (viewport.clientWidth * nextScale - viewport.clientWidth) / 2;
      const maxOffsetY =
        (viewport.clientHeight * nextScale - viewport.clientHeight) / 2;

      return {
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextTranslate.x)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextTranslate.y)),
      };
    },
    []
  );

  const applyScale = useCallback(
    (nextScale: number) => {
      const boundedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      setScale(boundedScale);
      setTranslate((current) => clampTranslate(current, boundedScale));
    },
    [clampTranslate]
  );

  const closeZoom = useCallback(() => {
    onClose();
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsPanning(false);
    activePointerIdRef.current = null;
    activePointersRef.current.clear();
    pinchDistanceRef.current = null;
  }, [onClose]);

  const zoomIn = useCallback(() => {
    applyScale(scale + ZOOM_STEP);
  }, [applyScale, scale]);

  const zoomOut = useCallback(() => {
    applyScale(scale - ZOOM_STEP);
  }, [applyScale, scale]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsPanning(false);
    activePointerIdRef.current = null;
    activePointersRef.current.clear();
    pinchDistanceRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY < 0) {
        zoomIn();
        return;
      }
      zoomOut();
    },
    [zoomIn, zoomOut]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size === 2) {
      const [firstPoint, secondPoint] = Array.from(
        activePointersRef.current.values()
      );

      pinchDistanceRef.current = Math.hypot(
        secondPoint.x - firstPoint.x,
        secondPoint.y - firstPoint.y
      );
      pinchScaleOriginRef.current = scale;
      setIsPanning(false);
      activePointerIdRef.current = null;
      return;
    }

    if (scale <= MIN_SCALE) return;

    activePointerIdRef.current = event.pointerId;
    panStartRef.current = { x: event.clientX, y: event.clientY };
    panOriginRef.current = { ...translate };
    setIsPanning(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    if (activePointersRef.current.size === 2 && pinchDistanceRef.current) {
      const [firstPoint, secondPoint] = Array.from(
        activePointersRef.current.values()
      );

      const nextDistance = Math.hypot(
        secondPoint.x - firstPoint.x,
        secondPoint.y - firstPoint.y
      );

      if (!nextDistance) return;

      const nextScale =
        pinchScaleOriginRef.current * (nextDistance / pinchDistanceRef.current);
      applyScale(nextScale);
      return;
    }

    if (
      !isPanning ||
      scale <= MIN_SCALE ||
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;

    setTranslate(
      clampTranslate(
        {
          x: panOriginRef.current.x + deltaX,
          y: panOriginRef.current.y + deltaY,
        },
        scale
      )
    );
  };

  const handlePointerEnd = (event?: PointerEvent<HTMLDivElement>) => {
    if (event) {
      activePointersRef.current.delete(event.pointerId);
    }

    if (
      event &&
      activePointerIdRef.current !== null &&
      event.currentTarget.hasPointerCapture(activePointerIdRef.current)
    ) {
      event.currentTarget.releasePointerCapture(activePointerIdRef.current);
    }

    activePointerIdRef.current = null;
    setIsPanning(false);
    pinchDistanceRef.current = null;

    if (activePointersRef.current.size === 1 && scale > MIN_SCALE) {
      const [remainingPointerId, remainingPoint] = Array.from(
        activePointersRef.current.entries()
      )[0];

      activePointerIdRef.current = remainingPointerId;
      panStartRef.current = { x: remainingPoint.x, y: remainingPoint.y };
      panOriginRef.current = { ...translate };
    }
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

  useEffect(() => {
    if (!open) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [open, handleWheel]);

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
          className="focus-ring-soft rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white disabled:opacity-40"
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
          className="focus-ring-soft rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white disabled:opacity-40"
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
          className="focus-ring-soft rounded-full bg-black/50 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:text-white"
        >
          원본
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeZoom();
          }}
          className="focus-ring-soft rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white"
          aria-label="이미지 확대 닫기"
        >
          <XMarkIcon className="size-7" />
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative h-full max-h-[92vh] w-full max-w-[95vw] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        style={{ touchAction: "none" }}
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
            touchAction: "none",
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
 * 본문 흐름 안에 들어가는 단일 이미지를 자연스럽게 보여주고, 클릭 시 공용 원본 보기로 연결
 */
export default function ZoomableImage({
  src,
  alt,
  isAnimated = false,
  className,
  priority = false,
  fetchPriority,
  loading = "lazy",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  quality = 85,
}: ZoomableImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsZoomed(true)}
        className={cn(
          "focus-ring-soft group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-2xl",
          className
        )}
        aria-label="이미지 크게 보기"
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          fetchPriority={fetchPriority}
          loading={priority ? undefined : loading}
          className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          sizes={sizes}
          quality={quality}
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
