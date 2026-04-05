/**
 * File Name : features/product/components/productDetail/ProductEditTopbarLink.tsx
 * Description : 제품 상세 상단 수정 링크
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.13  임도헌   Created   제품 상세 상단 수정 진입 시 returnTo 복귀 경로를 유지하는 링크 분리
 * 2026.03.13  임도헌   Modified  목록/프로필 복귀 문맥에서는 replace 기반 수정 진입으로 삭제 후 stale history를 방지
 * 2026.03.17  임도헌   Modified  일반 상세 수정 진입에도 flow=detail-edit를 포함하고 비채팅 returnTo 문맥에서는 replace 기반 진입으로 삭제 복귀를 안정화
 * 2026.03.18  임도헌   Modified  returnTo 재전달 전 sanitizeCallbackUrl을 적용해 링크 체인 안전성 보강
 */
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

interface ProductEditTopbarLinkProps {
  productId: number;
}

/**
 * 제품 상세 상단 수정 링크
 *
 * [기능]
 * - 현재 상세 URL의 returnTo 쿼리를 유지한 채 편집 화면으로 이동
 *
 * @param {ProductEditTopbarLinkProps} props - 제품 ID
 */
export default function ProductEditTopbarLink({
  productId,
}: ProductEditTopbarLinkProps) {
  const searchParams = useSearchParams();
  // 상세 URL의 returnTo를 정제한 뒤 편집 링크로 다시 전달
  const rawReturnTo = searchParams.get("returnTo");
  const returnTo = rawReturnTo
    ? sanitizeCallbackUrl(rawReturnTo)
    : null;
  // 비채팅 returnTo 문맥만 replace 진입으로 정리
  const shouldReplace =
    !!returnTo && !returnTo.startsWith("/chats/");
  const href = returnTo
    ? `/products/view/${productId}/edit?returnTo=${encodeURIComponent(returnTo)}&flow=detail-edit`
    : `/products/view/${productId}/edit?flow=detail-edit`;

  return (
    <Link
      href={href}
      replace={shouldReplace}
      className="appbar-link-btn hidden sm:inline-flex"
    >
      수정
    </Link>
  );
}
