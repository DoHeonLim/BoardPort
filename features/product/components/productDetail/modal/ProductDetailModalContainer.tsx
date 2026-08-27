/**
 * File Name : features/product/components/productDetail/modal/ProductDetailModalContainer.tsx
 * Description : 제품 상세 모달 컨테이너 (Intercepting Route용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   모달 스타일을 적용한 제품 상세 컨테이너 래퍼
 * 2025.06.08  임도헌   Modified  어두운 배경과 중앙 정렬 레이아웃 추가
 * 2025.11.13  임도헌   Modified  CloseButton(returnTo) 적용, role="dialog" 등 접근성 보강
 * 2026.01.10  임도헌   Modified  모바일 및 데스크톱 레이아웃 변경
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.02.27  임도헌   Modified  모바일 높이를 h-full로 고정하여 하단 액션바 짤림 현상 해결
 * 2026.03.05  임도헌   Modified  ProductDetailContainer에 isModalContext 전달
 * 2026.03.06  임도헌   Modified  상단 공유/옵션 메뉴 추가 및 포커스 복귀 처리 보강
 * 2026.03.06  임도헌   Modified  상세 상단 액션바 버튼 스타일을 공통 규칙으로 통일
 * 2026.03.09  임도헌   Modified  X/배경 닫기 시 history back 우선 처리로 뒤로가기 중복 방지
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.13  임도헌   Modified  모달 상세 수정 진입에 returnTo/flow=modal-edit를 연결해 편집 문맥을 유지
 * 2026.03.14  임도헌   Modified  공통 세션 refresh 플래그를 소비해 모달 편집 저장 완료 후 목록 릴레이로 다시 열린 상세를 1회만 새로고침하도록 보강
 * 2026.03.18  임도헌   Modified  모달 상세의 returnTo를 sanitizeCallbackUrl 기준으로 정리해 닫기/수정 복귀 경로 안전성 보강
 * 2026.03.22  임도헌   Modified  데스크톱 모달 높이와 보더 톤을 최근 상세 모달 기준으로 정리
 * 2026.04.02  임도헌   Modified  모달 상세에서 수정 진입은 push를 유지하고 저장 후 목록 릴레이 재오픈 흐름과 정합성을 맞춤
 * 2026.04.06  임도헌   Modified  modal-edit 저장 후 back 우선, 모달 재오픈 fallback 기준으로 주석 최신화
 * 2026.04.06  임도헌   Modified  모달 owner 액션도 상단 관리 메뉴로 통일
 * 2026.04.09  임도헌   Modified  모달 owner 메뉴에도 판매완료 숨김 상태를 전달해 상세/모달 관리 정책을 통일
 * 2026.04.24  임도헌   Modified  navigation refresh helper로 모달 refresh flag 소비와 back 가능 여부 판별을 정리
 * 2026.05.30  임도헌   Modified  모달 상세 상단 닫기/액션바 높이를 모바일 서브 헤더 기준으로 정리
 * 2026.06.01  임도헌   Modified  제품 모달 닫기 버튼의 배경과 hover 톤 조정
 * 2026.06.12  임도헌   Modified  채팅 왕복 후 모달 닫기 시 returnTo replace로 이전 히스토리 재진입 방지
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.08.24  임도헌   Modified  relay가 재오픈한 모달에서 편집 복귀 refresh 신호를 소비하도록 보강
 * 2026.08.27  임도헌   Modified  인터셉트 상세의 포커스 트랩·초기/복귀 포커스를 공용 useModalFocus로 통일
 */
"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import CloseButton from "@/components/global/CloseButton";
import ProductOwnerMenu from "@/features/product/components/productDetail/ProductOwnerMenu";
import ProductOptionMenu from "@/features/product/components/productDetail/ProductOptionMenu";
import ProductShareButton from "@/features/product/components/ProductShareButton";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import type { ProductDetailType } from "@/features/product/types";
import { cn } from "@/lib/utils";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";
import { useModalFocus } from "@/hooks/useModalFocus";

interface ProductDetailProps {
  product: ProductDetailType;
  isOwner: boolean;
  children: ReactNode;
}

/**
 * 제품 상세 페이지를 모달 형태로 띄우는 래퍼 컴포넌트
 * - 목록 페이지에서 상세로 이동 시, 전체 페이지 전환 대신 모달로 띄워 UX를 향상 (Next.js Parallel Routes)
 * - 배경 스크롤 잠금, 포커스 트랩, ESC 닫기 등 모달 필수 기능을 제공
 * - 닫기 시 `returnTo` 쿼리 파라미터를 사용하여 이전 목록 상태를 유지하며 복귀
 * - 모달 편집은 `flow=modal-edit`로 진입하고 저장 후 기존 모달 히스토리로 back 복귀를 우선 사용
 * - 닫기는 히스토리 상태 대신 returnTo replace로 처리해 채팅 왕복 후 이전 히스토리 재진입을 방지한다
 */
export default function ProductDetailModalContainer(props: ProductDetailProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);

  // 인터셉트 상세가 열린 동안 배경 목록의 스크롤을 잠근다.
  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  useEffect(() => {
    // modal-edit 저장 후 목록 relay가 새로 연 모달만 단발성 신호를 소비해 최신화한다.
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.PRODUCT_MODAL,
        props.product.id
      )
    ) {
      return;
    }

    router.refresh();
  }, [props.product.id, router]);

  // 모달 닫기 시 히스토리 상태 대신 사용할 안전한 목록 복귀 경로
  const returnTo = sanitizeCallbackUrl(sp.get("returnTo") ?? "/products");
  const handleOverlayClick = () => {
    router.replace(returnTo);
  };

  useModalFocus({
    open: true,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    onClose: handleOverlayClick,
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="상품 상세"
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "bg-surface shadow-xl flex flex-col overflow-hidden outline-none text-primary",
          // [Mobile] 부모 영역을 채워 이미지/본문 잘림 방지
          "w-full h-full rounded-none",
          // [Desktop] 중앙 모달 형태
          "sm:h-auto sm:max-h-[80dvh] sm:min-h-[500px] sm:max-w-screen-sm sm:rounded-2xl sm:border sm:border-border-subtle"
        )}
        onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
      >
        <div className="flex h-[52px] shrink-0 items-center justify-between gap-2.5 border-b border-border-subtle bg-surface px-3">
          <CloseButton
            fallbackHref="/products"
            returnTo={returnTo}
            closeOnEscape={false}
            className="bg-surface-dim/45 text-muted/80 hover:bg-surface-dim hover:text-primary active:bg-border/50 dark:bg-surface-dim/35 dark:hover:bg-surface-dim/70"
          />
          <div className="flex items-center gap-1">
            <ProductShareButton title={props.product.title} />
            {props.isOwner ? (
              <ProductOwnerMenu
                productId={props.product.id}
                isModalContext
                isSold={!!props.product.purchase_userId}
                isHidden={!!props.product.hidden_at}
              />
            ) : (
              <ProductOptionMenu
                productId={props.product.id}
                sellerId={props.product.userId}
                sellerName={props.product.user.username}
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          {props.children}
        </div>
      </div>
    </div>
  );
}
