/**
 * File Name : features/product/components/ProductShareButton.tsx
 * Description : 상품 상세 전용 공유 버튼 (클라이언트)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 * 2026.03.06  임도헌   Modified  터치 타겟 44px 기준 및 hover 스타일 정합성 보강
 * 2026.03.06  임도헌   Modified  상세 상단 액션바 공통 버튼 클래스(appbar-icon-btn) 적용
 * 2026.03.19  임도헌   Modified  공유 버튼을 보조 액션으로 읽히도록 투명도와 배경 강조를 한 단계 낮춤
 */
"use client";

import { ShareIcon } from "@heroicons/react/24/outline";
import { handleShare } from "@/lib/utils";

export default function ProductShareButton({ title }: { title: string }) {
  return (
    <button
      onClick={() => handleShare(title)}
      className="appbar-icon-btn text-muted/80 hover:bg-surface-dim/70"
      aria-label="상품 공유하기"
    >
      <ShareIcon className="size-5" />
    </button>
  );
}
