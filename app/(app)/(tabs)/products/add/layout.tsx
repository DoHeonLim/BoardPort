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
 * 2026.09.03  임도헌   Modified  직접 진입에서도 뒤로가기가 상품 목록으로 복귀하도록 고정
 * 2026.09.12  임도헌   Modified  헤더 경계선을 상품 등록 본문 폭에 맞춰 정렬
 * 2026.09.12  임도헌   Modified  returnTo 기반 상품 등록 이전 화면 복귀 지원
 * 2026.09.13  임도헌   Modified  작성 화면 상단바를 공통 하위 화면 헤더로 통일
 */

import type { ReactNode } from "react";
import BackButton from "@/components/global/BackButton";
import SubpageHeader from "@/components/global/SubpageHeader";

/**
 * 상품 등록 화면의 상단 앱바와 본문 컨테이너를 구성
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
      <SubpageHeader
        title="상품 등록"
        contentClassName="max-w-mobile"
        backAction={
          <BackButton
            fallbackHref="/products"
            preferFallback
            useReturnTo
            variant="appbar"
          />
        }
      />

      {/* 본문 컨테이너 */}
      <div className="mx-auto max-w-mobile pb-20">{children}</div>

      {/* 스크린리더 안내 */}
      <span className="sr-only" aria-live="polite">
        상품 등록 폼을 불러오는 중입니다…
      </span>
    </div>
  );
}
