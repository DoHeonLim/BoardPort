/**
 * File Name : components/ui/Carousel.tsx
 * Description : 여러 장 이미지를 슬라이드와 확대 보기로 보여주는 공용 캐러셀 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.10  임도헌   Created
 * 2024.12.10  임도헌   Modified  캐러셀 컴포넌트 추가
 * 2024.12.11  임도헌   Modified  캐러셀 드래그 기능 추가
 * 2024.12.17  임도헌   Modified  캐러셀 클래스네임 추가
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.03.12  임도헌   Modified  사용자 업로드 GIF만 Next 최적화 예외 처리하도록 isAnimated 메타 반영
 * 2026.03.12  임도헌   Modified  캐러셀 네비게이션과 인디케이터를 시맨틱 토큰 기반 오버레이 톤으로 통일
 * 2026.03.17  임도헌   Modified  제품/게시글 상세에서 이미지 클릭 시 전체 화면 확대가 가능하도록 공용 lightbox 추가
 * 2026.03.31  임도헌   Modified  캐러셀 확대 보기에도 공용 확대/축소 모달을 재사용하도록 정리
 * 2026.04.11  임도헌   Modified  상세 이미지 좌우 네비게이션을 투명 오버레이 톤으로 완화하고 border/blur 제거
 * 2026.04.14  임도헌   Modified  확대 모달은 필요 시에만 지연 로드하고 상세별 이미지 sizes/quality를 주입할 수 있게 조정
 */
"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

// 확대 모달의 실제 클릭 시점 한정 필요성에 따른 초기 캐러셀 번들 분리
const ImageZoomModal = dynamic(
  () =>
    import("@/components/ui/ZoomableImage").then((mod) => mod.ImageZoomModal),
  {
    ssr: false,
  }
);

interface ImageType {
  url: string;
  order?: number;
  isAnimated?: boolean;
}

interface CarouselProps {
  images: ImageType[];
  className?: string;
  imageSizes?: string;
  imageQuality?: number;
}

/**
 * 여러 장 이미지를 넘기고 원본 확대 보기까지 연결하는 공용 캐러셀.
 * 상세 화면처럼 컨텍스트마다 sizes/quality를 조정할 수 있도록 옵션을 열어둔다.
 */
export default function Carousel({
  images,
  className = "",
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  imageQuality = 85,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const dragStartX = useRef(0);
  const swipeTriggeredRef = useRef(false);

  const handlePrevious = () => {
    swipeTriggeredRef.current = true;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    swipeTriggeredRef.current = true;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 터치 스와이프 제어
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeTriggeredRef.current = false;
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) handleNext();
      else handlePrevious();
    }
  };

  // 마우스 드래그 스와이프 제어
  const handleMouseDown = (e: React.MouseEvent) => {
    swipeTriggeredRef.current = false;
    setIsDragging(true);
    dragStartX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const distance = dragStartX.current - e.clientX;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) handleNext();
      else handlePrevious();
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleImageClick = () => {
    // 스와이프 직후 click 오동작 방지
    if (swipeTriggeredRef.current) {
      swipeTriggeredRef.current = false;
      return;
    }
    setIsZoomed(true);
  };

  if (!images.length) return null;

  return (
    // 확대 버튼과 인디케이터를 포함한 전체 프레임 기준 overflow 제어
    <div
      className={cn(
        "relative w-full overflow-hidden bg-surface-dim",
        className
      )}
    >
      {/* 슬라이드 트랙 */}
      <div
        className="relative w-full h-full flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="min-w-full h-full relative flex items-center justify-center"
          >
            <div
              className="relative w-full h-full cursor-grab active:cursor-grabbing touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onClick={handleImageClick}
            >
              <Image
                src={`${image.url}/public`}
                alt={`이미지 ${index + 1}`}
                fill
                // 캐러셀의 화면 가득 채우기보다 원본 비율 유지 우선
                className="object-contain select-none"
                sizes={imageSizes}
                priority={index === 0}
                draggable={false}
                quality={imageQuality}
                unoptimized={!!image.isAnimated}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 네비게이션 버튼 */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation(); // 드래그 이벤트 전파 방지
              handlePrevious();
            }}
            className="focus-ring-soft absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-transparent p-2 text-white/90 transition-colors hover:bg-black/10"
            aria-label="이전 이미지"
          >
            <ChevronLeftIcon className="h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="focus-ring-soft absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-transparent p-2 text-white/90 transition-colors hover:bg-black/10"
            aria-label="다음 이미지"
          >
            <ChevronRightIcon className="h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" />
          </button>

          {/* 인디케이터 (Dots) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  "focus-ring-soft flex size-6 items-center justify-center rounded-full transition-colors",
                  index === currentIndex
                    ? "scale-110"
                    : "hover:bg-black/10"
                )}
                aria-label={`${index + 1}번 이미지로 이동`}
                aria-current={index === currentIndex}
              >
                <span
                  className={cn(
                    "block h-2 w-2 rounded-full shadow-sm",
                    index === currentIndex
                      ? "bg-brand"
                      : "bg-surface/85 hover:bg-surface"
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}

      <ImageZoomModal
        open={isZoomed}
        src={`${images[currentIndex].url}/public`}
        alt={`원본 이미지 ${currentIndex + 1}`}
        isAnimated={!!images[currentIndex].isAnimated}
        onClose={() => setIsZoomed(false)}
      />
    </div>
  );
}
