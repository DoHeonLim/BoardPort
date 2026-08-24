/**
 * File Name : app/(app)/(tabs)/products/@modal/(..)products/view/[id]/page.tsx
 * Description : products/view/[id] 인터셉트 후 모달 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.22  임도헌   Created
 * 2024.10.22  임도헌   Modified  모달 페이지 추가(페러렐 라우트)
 * 2024.11.02  임도헌   Modified  제품 삭제 버튼 편집 페이지로 옮김
 * 2024.11.08  임도헌   Modified  채팅방 생성 함수 추가
 * 2024.11.11  임도헌   Modified  클라우드 플레어 이미지 variants 추가
 * 2024.11.15  임도헌   Modified  본인이라면 채팅하기 버튼 필요 없으므로 코드 수정
 * 2024.11.21  임도헌   Modified  Chatroom을 productChatRoom으로 변경
 * 2024.11.21  임도헌   Modified  제품 제목이나 내용이 길어질 경우 창이 커지는 것 수정
 * 2024.12.05  임도헌   Modified  제품 상세 페이지 판매 여부 추가
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.12  임도헌   Modified  제품 이미지 캐러셀로 변경
 * 2024.12.12  임도헌   Modified  제품 생성 시간 표시 변경
 * 2024.12.15  임도헌   Modified  보드포트 컨셉으로 스타일 변경
 * 2024.12.16  임도헌   Modified  제품 조회수 추가
 * 2024.12.17  임도헌   Modified  서버코드 모두 app/products/[id]/actions로 이동
 * 2025.04.13  임도헌   Modified  completeness 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  condition 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  game_type 필드를 영어로 변경
 * 2025.06.08  임도헌   Modified  데이터 fetch와 UI 컨테이너로 분리 리팩토링
 * 2025.06.12  임도헌   Modified  app/(tabs)/products/@modal/(..)products/view/[id]/page로 이동
 * 2026.01.04  임도헌   Modified  getProductDetailData가 redirect/조회수/개인화를 포함 → 모달도 force-dynamic + revalidate=0 명시
 * 2026.01.26  임도헌   Modified  주석 설명 보강
 * 2026.02.02  임도헌   Modified  일반 상세 페이지와 로직 동기화 (Service 분리 및 병렬 처리)
 * 2026.02.03  임도헌   Modified  순서 보장(Sequencing) 패턴 적용: 조회수 증가 후 데이터 로드
 * 2026.02.04  임도헌   Modified  판매자와 조회자간의 차단 관계 확인 로직 추가(차단 관계일 경우 제품 정보 차단)
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.18  임도헌   Modified  인터셉트 모달에서도 returnTo 쿼리를 반영한 callbackUrl을 구성해 차단 후 복귀 문맥 보존
 * 2026.03.23  임도헌   Modified  인터셉트 모달도 일반 상세와 같은 양수 ID 가드로 정리해 잘못된 경로의 조회수/서비스 호출을 방지
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/products/@modal/(..)products/view/[id]/page.tsx 에서 app/(app)/(tabs)/products/@modal/(..)products/view/[id]/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  일반 상세와 동일한 공통 상세 로더/조회수 보정 흐름을 적용하고 서버 본문을 children으로 재사용
 * 2026.06.17  임도헌   Modified  제품 좋아요 상태 캐시를 조회자 기준으로 분리하도록 viewerId 전달
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import { notFound, redirect } from "next/navigation";
import { getProductDetailViewData } from "@/features/product/service/detail";
import { incrementViews } from "@/features/common/service/view";
import ProductDetailModalContainer from "@/features/product/components/productDetail/modal/ProductDetailModalContainer";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import getSession from "@/lib/session";
import ProductDetailContainer from "@/features/product/components/productDetail";

export const dynamic = "force-dynamic";

/**
 * 인터셉트된 제품 상세 모달
 *
 * [기능]
 * - 목록 페이지에서 상세로 진입 시 가로채기(Intercept) 패턴을 통한 병렬 모달 렌더링
 * - 일반 상세와 동일한 공통 상세 로더를 사용해 본문/개인화 상태/차단 정책을 일치시킴
 * - 판매자-조회자 간 차단 관계 검증 및 차단 시나리오에서 `/403` 리다이렉트 수행
 * - 가드를 통과한 실제 모달 진입만 조회수에 반영하고 현재 렌더 값에 즉시 반영
 */
export default async function ProductDetailModal(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return notFound();

  const session = await getSession();
  const userId = session?.id ?? null;

  // 인터셉트 모달도 일반 상세와 동일한 서버 로더 사용, 접근 정책 정렬
  const { product, likeStatus, isOwner, isBlocked } =
    await getProductDetailViewData(id, userId);

  if (!product) return notFound();

  const isBuyer = !!userId && userId === product.purchase_userId;
  if (product.hidden_at && !isOwner && !isBuyer) {
    return notFound();
  }

  if (isBlocked) {
    const returnTo = sanitizeCallbackUrl(searchParams?.returnTo ?? "/products");
    const callbackUrl = `/products/view/${id}?returnTo=${encodeURIComponent(
      returnTo
    )}`;
    redirect(
      `/403?reason=BLOCKED` +
        `&username=${encodeURIComponent(product.user.username)}` +
        `&callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
  }

  // 모달도 가드 통과 후에만 조회수 반영, 현재 렌더 값은 즉시 보정
  const counted = await incrementViews({
    target: "PRODUCT",
    targetId: id,
    viewerId: userId,
  });
  const currentViews = counted ? (product.views ?? 0) + 1 : product.views;

  return (
    <ProductDetailModalContainer product={product} isOwner={isOwner}>
      <ProductDetailContainer
        product={product}
        views={currentViews}
        isOwner={isOwner}
        likeCount={likeStatus.likeCount}
        isLiked={likeStatus.isLiked}
        viewerId={userId}
        isModalContext
      />
    </ProductDetailModalContainer>
  );
}
