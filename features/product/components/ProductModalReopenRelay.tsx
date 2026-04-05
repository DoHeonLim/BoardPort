/**
 * File Name : features/product/components/ProductModalReopenRelay.tsx
 * Description : 제품 목록 freshness 보강 및 상세 모달 재오픈을 함께 담당하는 목록 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.05  임도헌   Created   편집 완료 후 목록(/products) 경유 시 인터셉트 모달 재오픈 릴레이 추가
 * 2026.03.17  임도헌   Modified  삭제 후 back 복귀한 목록은 세션 refresh 플래그를 1회 소비해 stale list를 방지
 * 2026.03.18  임도헌   Modified  returnTo 재오픈 경로에 sanitizeCallbackUrl을 적용해 목록 복귀 경로 안전성 보강
 * 2026.04.02  임도헌   Modified  openProductId 중간 URL을 먼저 returnTo로 정리한 뒤 모달 상세를 다시 push해 닫기 후 목록 경로가 남도록 보정
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  consumeNavigationRefreshFlag,
  createNavigationRefreshFlagKey,
} from "@/lib/navigationRefreshFlag";

/**
 * 제품 목록 복귀 후 모달 상세 재오픈 릴레이
 *
 * [기능]
 * - `openProductId`가 붙은 중간 URL을 먼저 `returnTo` 목록 경로로 정리
 * - 목록 URL 반영이 끝난 뒤 인터셉트 상세를 다시 열어 모달 편집 저장 후 복귀를 안정화
 * - 목록으로 back 복귀한 경우 refresh 플래그를 1회 소비해 stale list를 방지
 */
export default function ProductModalReopenRelay() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const processingKeyRef = useRef<string | null>(null);
  const [pendingModalReopen, setPendingModalReopen] = useState<{
    id: number;
    returnTo: string;
  } | null>(null);

  const openProductId = sp.get("openProductId");
  const returnToParam = sp.get("returnTo");
  const currentHref = useMemo(
    () =>
      sanitizeCallbackUrl(
        sp?.size ? `${pathname}?${sp.toString()}` : pathname
      ),
    [pathname, sp]
  );

  useEffect(() => {
    const refreshKey = createNavigationRefreshFlagKey(
      "products-list-refresh",
      "root"
    );
    // detail/modal-edit 삭제 후 back으로 돌아온 목록만 1회 최신화
    if (!consumeNavigationRefreshFlag(refreshKey)) return;
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!openProductId) return;

    const id = Number(openProductId);
    if (!Number.isFinite(id) || id <= 0) {
      processingKeyRef.current = null;
      router.replace("/products");
      return;
    }

    const returnTo = sanitizeCallbackUrl(returnToParam ?? "/products");
    const reopenKey = `${id}:${returnTo}`;

    if (processingKeyRef.current === reopenKey) return;
    processingKeyRef.current = reopenKey;
    setPendingModalReopen({ id, returnTo });

    // 1) 먼저 openProductId가 붙은 중간 URL을 목록 경로로 정리
    // 2) 목록 URL 반영이 끝난 뒤에만 인터셉트 상세를 다시 push
    router.replace(returnTo);
  }, [openProductId, returnToParam, router]);

  useEffect(() => {
    if (!pendingModalReopen) return;
    if (currentHref !== pendingModalReopen.returnTo) return;

    const timer = window.setTimeout(() => {
      router.push(
        `/products/view/${pendingModalReopen.id}?returnTo=${encodeURIComponent(
          pendingModalReopen.returnTo
        )}`
      );
      processingKeyRef.current = null;
      setPendingModalReopen(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentHref, pendingModalReopen, router]);

  return null;
}
