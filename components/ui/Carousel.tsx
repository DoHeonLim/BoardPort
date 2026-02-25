/**
 * File Name : components/ui/Carousel.tsx
 * Description : 게시글 이미지 캐러셀 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.10  임도헌   Created
 * 2024.12.10  임도헌   Modified  캐러셀 컴포넌트 추가
 * 2024.12.11  임도헌   Modified  캐러셀 드래그 기능 추가
 * 2024.12.17  임도헌   Modified  캐러셀 클래스네임 추가
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 */
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface ImageType {
  url: string;
  order?: number;
}

interface CarouselProps {
  images: ImageType[];
  className?: string;
}

export default function Carousel({ images, className = "" }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
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

  // 마우스 드래그 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
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

  if (!images.length) return null;

  return (
    // overflow-hidden을 최상위에 적용하여 자식 요소가 튀어나가는 것 방지
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
          // min-w-full로 각 슬라이드가 컨테이너 너비를 꽉 채우도록 설정
          <div
            key={index}
            className="min-w-full h-full relative flex items-center justify-center"
          >
            <div
              className="relative w-full h-full cursor-grab active:cursor-grabbing"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <Image
                src={`${image.url}/public`}
                alt={`이미지 ${index + 1}`}
                fill
                // object-contain으로 이미지가 잘리지 않고 전체가 보이도록 함 (배경색은 부모 div가 담당)
                // 꽉 채우고 싶다면 object-cover로 변경 가능
                className="object-contain select-none"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={index === 0}
                draggable={false}
                quality={85}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 네비게이션 버튼 (2장 이상일 때만) */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation(); // 드래그 이벤트 전파 방지
              handlePrevious();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white transition-all backdrop-blur-sm z-10"
            aria-label="이전 이미지"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white transition-all backdrop-blur-sm z-10"
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
                    ? "bg-white scale-110"
                    : "bg-white/50 hover:bg-white/80"
                )}
                aria-label={`${index + 1}번 이미지로 이동`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
