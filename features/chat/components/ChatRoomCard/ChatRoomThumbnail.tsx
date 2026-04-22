/**
 * File Name : features/chat/components/chatRoomCard/ChatRoomThumbnail.tsx
 * Description : 채팅방 제품 썸네일 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   제품 썸네일 컴포넌트 분리
 * 2025.07.24  임도헌   Modified  BoardPort 스타일 적용
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.12  임도헌   Modified  채팅방 썸네일에 GIF 조건부 최적화 예외 처리를 imageAnimated 메타로 연동
 * 2026.04.14  임도헌   Modified  채팅 목록 최적화 대응으로 썸네일 초기 로드 비용을 낮춤
 */
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ChatProduct } from "@/features/chat/types";

interface ChatRoomThumbnailProps {
  product: ChatProduct;
}

/**
 * 채팅방 목록의 제품 썸네일 이미지
 */
export default function ChatRoomThumbnail({ product }: ChatRoomThumbnailProps) {
  return (
    <div
      className={cn(
        "relative size-12 sm:size-14 flex-shrink-0 rounded-xl overflow-hidden",
        "bg-surface-dim border border-border"
      )}
    >
      {product.imageUrl ? (
        <Image
          src={`${product.imageUrl}/avatar`}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 48px, 56px"
          unoptimized={!!product.imageAnimated}
          className="object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-xs text-muted">
          No Img
        </div>
      )}
    </div>
  );
}
