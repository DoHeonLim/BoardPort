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
 * 2026.08.28  임도헌   Modified  게시글 블록 서버 경계 분리에 맞춰 확대 상호작용의 클라이언트 island 책임 명시
 * 2026.08.28  임도헌   Modified  확대·이동·포인터 제어 함수 JSDoc 보강
 * 2026.09.06  임도헌   Modified  확대 레이어 포털과 중첩 모달 포커스·Escape 복귀 관리 적용
 * 2026.09.06  임도헌   Modified  확대 이미지의 방향키 이동과 키보드 조작 안내 추가
 * 2026.09.11  임도헌   Modified  모달 초기 포커스와 기본 배율 사진 탐색 지원
 * 2026.09.11  임도헌   Modified  이미지 전환 시 전체 화면 포커스 테두리 제거
 */

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";
import { useModalFocus } from "@/hooks/useModalFocus";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.25;
const KEYBOARD_PAN_STEP = 32;

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
  onPrevious?: () => void;
  onNext?: () => void;
  positionLabel?: string;
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
  onPrevious,
  onNext,
  positionLabel,
}: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const instructionsId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
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

  /**
   * 확대 배율에서 이미지가 뷰포트 밖으로 과도하게 이동하지 않도록 좌표 제한
   *
   * @param nextTranslate - 적용하려는 이미지 이동 좌표
   * @param nextScale - 좌표 제한을 계산할 확대 배율
   * @returns 뷰포트 경계 안으로 보정된 이동 좌표
   */
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

  /**
   * 허용 범위로 보정한 확대 배율과 해당 배율의 유효 이동 좌표 적용
   *
   * @param nextScale - 적용하려는 확대 배율
   */
  const applyScale = useCallback(
    (nextScale: number) => {
      const boundedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      setScale(boundedScale);
      setTranslate((current) => clampTranslate(current, boundedScale));
    },
    [clampTranslate]
  );

  /** 확대 상태와 포인터 추적값을 초기화한 뒤 모달을 닫는다. */
  const closeZoom = useCallback(() => {
    onClose();
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsPanning(false);
    activePointerIdRef.current = null;
    activePointersRef.current.clear();
    pinchDistanceRef.current = null;
  }, [onClose]);

  useModalFocus({
    open,
    containerRef: modalRef,
    initialFocusRef: modalRef,
    onClose: closeZoom,
  });

  /** 현재 배율을 한 단계 확대 */
  const zoomIn = useCallback(() => {
    applyScale(scale + ZOOM_STEP);
  }, [applyScale, scale]);

  /** 현재 배율을 한 단계 축소 */
  const zoomOut = useCallback(() => {
    applyScale(scale - ZOOM_STEP);
  }, [applyScale, scale]);

  /** 확대 배율과 이동 상태를 초기값으로 되돌린다. */
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsPanning(false);
    activePointerIdRef.current = null;
    activePointersRef.current.clear();
    pinchDistanceRef.current = null;
  }, []);

  /** 확대 상태를 초기화하고 인접 이미지로 이동 */
  const navigateImage = useCallback(
    (direction: "previous" | "next") => {
      resetZoom();
      if (direction === "previous") onPrevious?.();
      else onNext?.();
    },
    [onNext, onPrevious, resetZoom]
  );

  /** 확대 이미지를 방향키 입력량만큼 빈 영역이 생기지 않는 범위에서 이동 */
  const panWithKeyboard = useCallback(
    (deltaX: number, deltaY: number) => {
      if (scale <= MIN_SCALE) return;
      setTranslate((current) =>
        clampTranslate({ x: current.x + deltaX, y: current.y + deltaY }, scale)
      );
    },
    [clampTranslate, scale]
  );

  /**
   * 마우스 휠 방향을 확대 또는 축소 동작으로 변환
   *
   * @param event - 이미지 뷰포트에서 발생한 휠 이벤트
   */
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

  /**
   * 포인터 등록과 단일 이동 또는 두 손가락 확대 제스처 시작
   *
   * @param event - 이미지 뷰포트의 포인터 시작 이벤트
   */
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

  /**
   * 활성 포인터 위치 갱신과 이미지 이동 또는 핀치 배율 적용
   *
   * @param event - 이미지 뷰포트의 포인터 이동 이벤트
   */
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

  /**
   * 종료된 포인터 해제와 남은 포인터의 이동 기준점 재설정
   *
   * @param event - 종료되거나 취소된 포인터 이벤트
   */
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

    /** 키보드 입력과 확대·축소 및 확대 이미지 이동 연결 */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        zoomOut();
        return;
      }

      const panDelta: Record<string, [number, number]> = {
        ArrowLeft: [-KEYBOARD_PAN_STEP, 0],
        ArrowRight: [KEYBOARD_PAN_STEP, 0],
        ArrowUp: [0, -KEYBOARD_PAN_STEP],
        ArrowDown: [0, KEYBOARD_PAN_STEP],
      };
      const delta = panDelta[event.key];
      if (delta) {
        event.preventDefault();
        if (scale > MIN_SCALE) {
          panWithKeyboard(...delta);
        } else if (event.key === "ArrowLeft" && onPrevious) {
          navigateImage("previous");
        } else if (event.key === "ArrowRight" && onNext) {
          navigateImage("next");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    navigateImage,
    onNext,
    onPrevious,
    open,
    panWithKeyboard,
    scale,
    zoomIn,
    zoomOut,
  ]);

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

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 확대 보기"
      aria-describedby={instructionsId}
      tabIndex={-1}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(event) => {
        event.stopPropagation();
        closeZoom();
      }}
    >
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            zoomOut();
          }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white disabled:opacity-40"
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
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white disabled:opacity-40"
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
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-full bg-black/50 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:text-white"
        >
          원본
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeZoom();
          }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:text-white"
          aria-label="이미지 확대 닫기"
        >
          <XMarkIcon className="size-7" />
        </button>
      </div>

      {onPrevious ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigateImage("previous");
          }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 absolute left-3 top-1/2 z-40 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85 sm:left-5"
          aria-label="이전 이미지"
        >
          <ChevronLeftIcon className="size-6" />
        </button>
      ) : null}

      {onNext ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigateImage("next");
          }}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 absolute right-3 top-1/2 z-40 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85 sm:right-5"
          aria-label="다음 이미지"
        >
          <ChevronRightIcon className="size-6" />
        </button>
      ) : null}

      <div
        ref={viewportRef}
        role="group"
        aria-label="확대 이미지 이동 영역"
        aria-describedby={instructionsId}
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

      <p
        id={instructionsId}
        className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-2 text-center text-xs text-white"
      >
        {onPrevious && onNext
          ? "+·− 키로 확대·축소하고, 기본 크기에서는 좌우 방향키로 사진을 넘길 수 있습니다"
          : "+·− 키로 확대·축소하고, 확대 후 방향키로 사진을 이동할 수 있습니다"}
        {positionLabel ? ` · ${positionLabel}` : ""}
      </p>
    </div>,
    document.body
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
