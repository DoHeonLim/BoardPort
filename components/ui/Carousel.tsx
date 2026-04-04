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
 */
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { ImageZoomModal } from "@/components/ui/ZoomableImage";
import { cn } from "@/lib/utils";

interface ImageType {
  url: string;
  order?: number;
  isAnimated?: boolean;
}

interface CarouselProps {
  images: ImageType[];
  className?: string;
}

/**
 * 여러 장 이미지를 넘기고 원본 확대 보기까지 연결하는 공용 캐러셀 컴포넌트
 *
 * - 터치 스와이프/마우스 드래그 네비게이션
 * - 좌우 버튼과 인디케이터 제공
 * - 공용 이미지 확대/축소 모달 연동
 *
 * @param {CarouselProps} props - 이미지 목록과 컨테이너 스타일 설정
 * @returns {JSX.Element | null} 이미지 캐러셀 또는 빈 상태
 */
export default function Carousel({ images, className = "" }: CarouselProps) {
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
                // 여러 장 묶음에서도 원본 비율을 우선 유지하는 공용 표시 정책
                className="object-contain select-none"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={index === 0}
                draggable={false}
                quality={85}
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
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border-subtle bg-background/80 p-2 text-primary transition-all backdrop-blur-sm hover:bg-surface"
            aria-label="이전 이미지"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border-subtle bg-background/80 p-2 text-primary transition-all backdrop-blur-sm hover:bg-surface"
            aria-label="다음 이미지"
          >
            <ChevronRightIcon className="w-6 h-6" />
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
                  "w-2 h-2 rounded-full transition-all shadow-sm",
                  index === currentIndex
                    ? "bg-brand scale-110"
                    : "bg-surface/85 hover:bg-surface"
                )}
                aria-label={`${index + 1}번 이미지로 이동`}
              />
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
