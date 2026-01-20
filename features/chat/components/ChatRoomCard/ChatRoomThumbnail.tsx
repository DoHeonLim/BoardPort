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
 */
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface ChatRoomThumbnailProps {
  product: {
    imageUrl: string;
    title: string;
  };
}

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
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-xs text-muted">
          No Img
        </div>
      )}
    </div>
  );
}
