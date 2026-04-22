/**
 * File Name : features/product/components/ProductModalReopenRelay.tsx
 * Description : 제품 목록 freshness 보강 및 모달 상세 fallback 재오픈을 담당하는 목록 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.05  임도헌   Created   편집 완료 후 목록(/products) 경유 시 인터셉트 모달 재오픈 릴레이 추가
 * 2026.03.17  임도헌   Modified  삭제 후 back 복귀한 목록은 세션 refresh 플래그를 1회 소비해 stale list를 방지
 * 2026.03.18  임도헌   Modified  returnTo 재오픈 경로에 sanitizeCallbackUrl을 적용해 목록 복귀 경로 안전성 보강
 * 2026.04.02  임도헌   Modified  openProductId 중간 URL을 먼저 returnTo로 정리한 뒤 모달 상세를 다시 push하는 fallback 릴레이로 보정
 * 2026.04.06  임도헌   Modified  history back 우선 정책 기준에 맞춰 fallback 릴레이 역할을 명시
 * 2026.04.13  임도헌   Modified  재오픈 경로 계산 보조 함수를 분리하고 단계형 인라인 주석을 정리
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  consumeNavigationRefreshFlag,
  createNavigationRefreshFlagKey,
} from "@/lib/navigationRefreshFlag";

function getSanitizedCurrentHref(
  pathname: string,
  searchParams: ReadonlyURLSearchParams
) {
  return sanitizeCallbackUrl(
    searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname
  );
}

function parseOpenProductId(value: string | null) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function buildProductModalHref(id: number, returnTo: string) {
  return `/products/view/${id}?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * 제품 목록 복귀 후 모달 상세 재오픈 릴레이
 *
 * [기능]
 * - `openProductId`가 붙은 중간 URL을 먼저 `returnTo` 목록 경로로 정리
 * - history back 대상이 없을 때만 인터셉트 상세를 다시 여는 fallback 복귀 경로 제공
 * - 삭제/수정 후 back 복귀한 목록은 세션 refresh 플래그를 1회 소비해 stale list를 방지
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
    () => getSanitizedCurrentHref(pathname, sp),
    [pathname, sp]
  );

  useEffect(() => {
    const refreshKey = createNavigationRefreshFlagKey(
      "products-list-refresh",
      "root"
    );

    if (!consumeNavigationRefreshFlag(refreshKey)) return;
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!openProductId) return;

    const id = parseOpenProductId(openProductId);
    if (!id) {
      processingKeyRef.current = null;
      router.replace("/products");
      return;
    }

    const returnTo = sanitizeCallbackUrl(returnToParam ?? "/products");
    const reopenKey = `${id}:${returnTo}`;

    if (processingKeyRef.current === reopenKey) return;
    processingKeyRef.current = reopenKey;
    setPendingModalReopen({ id, returnTo });
    router.replace(returnTo);
  }, [openProductId, returnToParam, router]);

  useEffect(() => {
    if (!pendingModalReopen) return;
    if (currentHref !== pendingModalReopen.returnTo) return;

    const timer = window.setTimeout(() => {
      router.push(
        buildProductModalHref(
          pendingModalReopen.id,
          pendingModalReopen.returnTo
        )
      );
      processingKeyRef.current = null;
      setPendingModalReopen(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentHref, pendingModalReopen, router]);

  return null;
}
