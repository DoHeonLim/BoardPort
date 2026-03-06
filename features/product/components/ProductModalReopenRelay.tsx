/**
 * File Name : features/product/components/ProductModalReopenRelay.tsx
 * Description : 제품 상세 모달 재오픈 릴레이 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.05  임도헌   Created   편집 완료 후 목록(/products) 경유 시 인터셉트 모달 재오픈 릴레이 추가
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProductModalReopenRelay() {
  const router = useRouter();
  const sp = useSearchParams();
  const onceRef = useRef(false);

  const openProductId = sp.get("openProductId");
  const returnToParam = sp.get("returnTo");

  useEffect(() => {
    if (onceRef.current) return;
    if (!openProductId) return;
    onceRef.current = true;

    const id = Number(openProductId);
    if (!Number.isFinite(id) || id <= 0) {
      router.replace("/products");
      return;
    }

    const returnTo =
      returnToParam && returnToParam.startsWith("/")
        ? returnToParam
        : "/products";

    // 1) 먼저 목록 URL로 정리
    router.replace(returnTo);

    // 2) 다음 틱에 인터셉트 상세로 진입 (모달 오픈)
    const timer = window.setTimeout(() => {
      router.push(
        `/products/view/${id}?returnTo=${encodeURIComponent(returnTo)}`
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openProductId, returnToParam, router]);

  return null;
}
