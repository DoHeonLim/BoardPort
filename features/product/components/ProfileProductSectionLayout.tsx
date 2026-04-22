"use client";

/**
 * File Name : features/product/components/ProfileProductSectionLayout.tsx
 * Description : 프로필 하위 제품 섹션(판매/구매/찜) 공통 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   판매/구매/찜 형제 경로의 공통 앱바 레이아웃 통합
 * 2026.04.09  임도헌   Modified  App Router soft navigation에서 형제 경로 진입 시 스크롤 문맥이 남지 않도록 pathname 기준 상단 초기화 추가
 * 2026.04.10  임도헌   Modified  products 타이포 정책에 맞춰 섹션 앱바 타이틀 weight를 500 기준으로 정리
 * 2026.04.18  임도헌   Modified  프로필 상품 하위 페이지 헤더를 고정 + 높이 스페이서 구조로 정리하고 스크롤 초기화 책임을 template로 분리
 */

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

function resolveTitle(pathname: string) {
  if (pathname.endsWith("/my-sales")) return "판매 내역";
  if (pathname.endsWith("/my-purchases")) return "구매 내역";
  if (pathname.endsWith("/my-likes")) return "찜한 내역";
  return "상품 내역";
}

const SECTION_HEADER_HEIGHT = 56;

/**
 * 프로필 > 제품 하위 섹션의 공통 프레임
 *
 * - 판매/구매/찜 내역이 모두 같은 앱바 구조를 사용
 * - 제목은 현재 pathname 기준으로 결정해 개별 레이아웃 중복을 줄인다
 * - 형제 경로 이동 시 스크롤 초기화는 재마운트되는 `template.tsx`에서 처리하고,
 *   이 레이아웃은 헤더 프레임과 본문 시작 위치만 책임진다
 */
export default function ProfileProductSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <div className="min-h-screen bg-background transition-colors">
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 w-full",
          "border-b border-border-subtle bg-background shadow-sm",
          "transition-colors"
        )}
      >
        <div
          className="mx-auto flex max-w-mobile items-center gap-3 px-4"
          style={{ height: `${SECTION_HEADER_HEIGHT}px` }}
        >
          <BackButton
            fallbackHref="/profile"
            variant="appbar"
            className="px-0"
          />
          <h1 className="text-base font-medium text-primary">{title}</h1>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="shrink-0"
        style={{ height: `${SECTION_HEADER_HEIGHT}px` }}
      />

      <main className="mx-auto max-w-mobile pb-24">{children}</main>
    </div>
  );
}
