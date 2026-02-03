/**
 * File Name : app/products/view/[id]/page.tsx
 * Description : 제품 상세 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 상세 페이지 추가
 * 2024.10.17  임도헌   Modified  이미지 object-cover로 변경
 * 2024.10.17  임도헌   Modified  제품 삭제 기능 추가
 * 2024.10.26  임도헌   Modified  메타데이터 추가
 * 2024.11.02  임도헌   Modified  제품 삭제 버튼 편집 페이지로 옮김
 * 2024.11.09  임도헌   Modified  제품 채팅방 생성 함수 추가
 * 2024.11.11  임도헌   Modified  클라우드 플레어 이미지 variants 추가
 * 2024.11.15  임도헌   Modified  본인이라면 채팅하기 버튼 필요 없으므로 코드 수정, 캐싱 기능 추가
 * 2024.11.21  임도헌   Modified  Chatroom을 productChatRoom으로 변경
 * 2024.12.05  임도헌   Modified  제품 상세 페이지 판매 여부 추가
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.11  임도헌   Modified  제품 사진 캐러셀 추가
 * 2024.12.11  임도헌   Modified  제품 좋아요 추가
 * 2024.12.11  임도헌   Modified  뒤로가기 버튼 추가
 * 2024.12.12  임도헌   Modified  제품 생성 시간 표시 변경
 * 2024.12.14  임도헌   Modified  getProduct 함수 수정(조회수 증가)
 * 2024.12.16  임도헌   Modified  제품 조회수 업데이트 함수 추가
 * 2024.12.16  임도헌   Modified  제품 상세를 보드게임 제품 형식으로 변경
 * 2024.12.17  임도헌   Modified  서버코드 모두 app/products/[id]/actions로 이동
 * 2024.12.22  임도헌   Modified  채팅방 생성 함수 변경, 제품 캐싱 함수 변경
 * 2024.12.25  임도헌   Modified  제품 상세 페이지 다크모드 추가
 * 2024.12.25  임도헌   Modified  제품 상세 정보 컴포넌트 분리
 * 2025.04.13  임도헌   Modified  completeness 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  condition 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  game_type 필드를 영어로 변경
 * 2025.06.08  임도헌   Modified  데이터 fetch와 UI 컨테이너로 분리 리팩토링
 * 2025.11.13  임도헌   Modified  뒤로가기 layout으로 위임
 * 2026.01.04  임도헌   Modified  generateMetadata에서 getProductDetailData 호출 제거(redirect/조회수/개인화 부작용 방지) → title 전용 fetch로 분리
 * 2026.01.26  임도헌   Modified  주석 설명 보강
 * 2026.02.02  임도헌   Modified  조회수/좋아요 로직을 Service에서 Page로 이동 (병렬 처리)
 */

import { notFound } from "next/navigation";
import {
  getCachedProduct,
  getCachedProductTitleById,
} from "@/features/product/service/detail";
import { getCachedProductLikeStatus } from "@/features/product/service/like";
import { incrementViews } from "@/features/common/service/view";
import ProductDetailContainer from "@/features/product/components/productDetail";
import getSession from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const title = await getCachedProductTitleById(id);

  return {
    title: title || "제품 상세",
  };
}

interface ProductDetailPageProps {
  params: { id: string };
}

/**
 * 제품 상세 페이지
 *
 * [기능]
 * 1. `Promise.all`을 사용하여 제품 정보, 좋아요 상태, 조회수 증가를 병렬로 처리합니다.
 * 2. 조회수 쿨다운(3분) 로직을 거쳐 `didIncrement`가 true일 때만 화면에 +1 된 조회수를 표시합니다.
 * 3. 로그인 세션을 확인하여 소유자 여부(`isOwner`)를 판단합니다.
 */
export default async function ProductDetail({
  params,
}: ProductDetailPageProps) {
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

  // 3. 조회수 표시 보정 (현재 유저가 증가시켰다면 +1 반영)
  const finalViews = product.views + (didIncrement ? 1 : 0);

  return (
    <ProductDetailContainer
      product={product}
      views={finalViews}
      isOwner={isOwner}
      likeCount={likeStatus.likeCount}
      isLiked={likeStatus.isLiked}
    />
  );
}
