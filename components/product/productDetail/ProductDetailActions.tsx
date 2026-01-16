/**
File Name : components/productDetail/ProductDetailActions
Description : 제품 상세 좋아요 및 채팅 버튼 컴포넌트
Author : 임도헌

History
Date        Author   Status    Description
2025.06.08  임도헌   Created   좋아요 및 채팅 인터랙션 컴포넌트 분리
2026.01.10  임도헌   Modified  시맨틱 토큰 적용 (bg-surface-dim, border-border)
*/
"use client";

import Link from "next/link";
import ProductLikeButton from "@/components/product/ProductLikeButton";
import ChatButton from "@/components/chat/ChatButton";

interface ProductDetailActionsProps {
  productId: number;
  isLiked: boolean;
  likeCount: number;
  isOwner: boolean;
}

export default function ProductDetailActions({
  productId,
  isLiked,
  likeCount,
  isOwner,
}: ProductDetailActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-mobile mx-auto">
      <div
        className="
          flex items-center justify-between gap-4 
          px-2 pt-2
          bg-surface/95 backdrop-blur-md 
          border-t border-border 
          pb-[env(safe-area-inset-bottom)]
          shadow-[0_-2px_10px_0px_rgba(0,0,0,0.05)] dark:shadow-none
        "
      >
        {/* 좋아요 버튼 */}
        <div className="flex items-center">
          <ProductLikeButton
            productId={productId}
            isLiked={isLiked}
            likeCount={likeCount}
          />
        </div>

        {/* 액션 버튼 (채팅 or 수정) */}
        <div className="flex-1 mr-4">
          {isOwner ? (
            <Link
              href={`/products/view/${productId}/edit`}
              // 수정 버튼 색상도 테마에 맞춰 미세 조정
              className="flex items-center justify-center w-full h-12 rounded-xl font-bold text-base bg-brand text-white hover:bg-brand-dark dark:bg-brand-light dark:text-gray-900 dark:hover:bg-brand transition-colors shadow-sm active:scale-[0.98]"
            >
              게시글 수정
            </Link>
          ) : (
            <div className="w-full">
              <ChatButton productId={productId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
