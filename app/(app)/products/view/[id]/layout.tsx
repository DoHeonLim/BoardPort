/**
 * File Name : app/(app)/products/view/[id]/layout.tsx
 * Description : 제품 상세 공통 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   제품 상세 전용 상단바 도입
 * 2026.01.10  임도헌   Modified  [Rule 3.2]모바일 뷰 제약 준수 & 시맨틱 토큰 적용
 * 2026.02.13  임도헌   Modified  상단바에 공유하기 버튼 추가
 * 2026.03.05  임도헌   Modified  상단 수정 링크를 replace로 변경해 뒤로가기 스택 최적화
 * 2026.03.06  임도헌   Modified  제품 상세 상단 액션바 버튼/칩 스타일을 다른 상세 화면과 통일
 * 2026.03.12  임도헌   Modified  제품 상세 헤더를 flat 톤과 border-border-subtle 기준으로 통일
 * 2026.03.13  임도헌   Modified  상단 수정 링크를 클라이언트 분리해 returnTo 복귀 경로를 유지하도록 보강
 * 2026.03.13  임도헌   Modified  상단 뒤로가기 버튼이 returnTo 복귀 경로를 선택적으로 따르도록 보강
 * 2026.03.14  임도헌   Modified  상세/수정/모달 편집이 하나의 layout 헤더를 공유하며 뒤로가기 규칙이 충돌하던 문제를 해소하기 위해 제품 상세 공통 헤더를 제거하고 페이지별 헤더로 분리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/products/view/[id]/layout.tsx 에서 app/(app)/products/view/[id]/layout.tsx 로 변경 (라우트 그룹 개편)
*/

import type { ReactNode } from "react";

/**
 * 제품 상세 공통 레이아웃
 *
 * [기능]
 * - 제품 상세 및 수정 페이지의 공통 배경/본문 폭만 담당
 * - 상단 헤더와 복귀 규칙은 각 페이지에서 직접 렌더링
 *
 * @param {ReactNode} children - 상세/수정 페이지 본문
 */
export default function ProductDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-primary transition-colors">
      <main className="mx-auto max-w-mobile">{children}</main>
    </div>
  );
}

