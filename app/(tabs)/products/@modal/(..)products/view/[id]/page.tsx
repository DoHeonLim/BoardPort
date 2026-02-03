/**
 * File Name : app/(tabs)/products/@modal/(..)products/view/[id]/page.tsx
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
 */

import { notFound } from "next/navigation";
import { getCachedProduct } from "@/features/product/service/detail";
import { getCachedProductLikeStatus } from "@/features/product/service/like";
import { incrementViews } from "@/features/common/service/view";
import ProductDetailModalContainer from "@/features/product/components/productDetail/modal/ProductDetailModalContainer";
import getSession from "@/lib/session";

// 조회수 증가 및 개인화(좋아요) 로직이 포함되므로 동적 렌더링 강제
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProductDetailModalProps {
  params: { id: string };
}

/**
 * 인터셉트된 제품 상세 모달
 *
 * - 목록 페이지에서 상세로 진입 시 가로채서 띄우는 모달입니다.
 * - 일반 상세 페이지(`app/products/view/[id]/page.tsx`)와 동일한 데이터 로딩 로직을 수행합니다.
 *   (제품 정보, 좋아요 상태, 조회수 증가)
 */
export default async function ProductDetailModal({
  params,
}: ProductDetailModalProps) {
  const id = Number(params.id);
  if (isNaN(id)) return notFound();

  const session = await getSession();
  const userId = session?.id ?? null;

  // 1. 데이터 병렬 조회 & 조회수 증가
  const [product, likeStatus, didIncrement] = await Promise.all([
    getCachedProduct(id),
    getCachedProductLikeStatus(id, userId),
    incrementViews({
      target: "PRODUCT",
      targetId: id,
      viewerId: userId,
    }),
  ]);

  if (!product) return notFound();

  // 2. 권한 확인
  const isOwner = !!userId && userId === product.userId;

  // 3. 조회수 표시 보정
  const finalViews = product.views + (didIncrement ? 1 : 0);

  return (
    <ProductDetailModalContainer
      product={product}
      views={finalViews}
      isOwner={isOwner}
      likeCount={likeStatus.likeCount}
      isLiked={likeStatus.isLiked}
    />
  );
}
