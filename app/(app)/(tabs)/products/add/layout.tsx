/**
 * File Name : app/(app)/(tabs)/products/add/layout.tsx
 * Description : 제품 등록 레이아웃(상단바: 뒤로가기 + 제목, 본문 컨테이너)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   뒤로가기/제목 상단바 + 공통 컨테이너
 * 2026.01.11  임도헌   Modified  [Rule 3.2] 모바일 최대 너비 제약 및 시맨틱 토큰 적용
 * 2026.03.12  임도헌   Modified  제품 등록 헤더를 flat 톤과 border-border-subtle 기준으로 통일
 * 2026.04.10  임도헌   Modified  app 타이포 정책에 맞춰 제품 등록 상단 제목 weight를 500 기준으로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/products/add/layout.tsx 에서 app/(app)/(tabs)/products/add/layout.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified  모바일 작성 헤더 높이와 좌우 여백을 압축
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.08.27  임도헌   Modified  상위 탭 레이아웃과 중복되던 main 랜드마크 제거
 * 2026.08.28  임도헌   Modified  상품 등록 레이아웃 함수 JSDoc 보강
 */

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import { cn } from "@/lib/utils";

/**
 * 상품 등록 화면의 상단 앱바와 본문 컨테이너를 구성한다.
 *
 * @param props - 상품 등록 페이지 콘텐츠
 * @returns 상품 등록 전용 레이아웃
 */
export default function AddProductLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-primary transition-colors">
      {/* 상단바 */}
      <header
        className={cn(
          "sticky top-0 z-40 h-[52px] w-full",
          "border-b border-border-subtle bg-background shadow-sm",
          "transition-colors"
        )}
        role="banner"
      >
        <div className="mx-auto flex h-full max-w-mobile items-center gap-2.5 px-3">
          <BackButton fallbackHref="/products" variant="appbar" />
          <h1 className="text-base font-medium text-primary">상품 등록</h1>
        </div>
      </header>

      {/* 본문 컨테이너 */}
      <div className="mx-auto max-w-mobile pb-20">{children}</div>

      {/* 스크린리더 안내 */}
      <span className="sr-only" aria-live="polite">
        상품 등록 폼을 불러오는 중입니다…
      </span>
    </div>
  );
}
