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
 * 2026.02.03  임도헌   Modified  순서 보장(Sequencing) 패턴 적용: 조회수 증가 후 데이터 로드
 * 2026.02.04  임도헌   Modified  판매자와 조회자간의 차단 관계 확인 로직 추가(차단 관계일 경우 제품 정보 차단)
 * 2026.02.13  임도헌   Modified  generateMetadata 확장 (description 추가)
 */

import { notFound, redirect } from "next/navigation";
import { getCachedProduct } from "@/features/product/service/detail";
import { getCachedProductLikeStatus } from "@/features/product/service/like";
import { incrementViews } from "@/features/common/service/view";
import { checkBlockRelation } from "@/features/user/service/block";
import ProductDetailContainer from "@/features/product/components/productDetail";
import getSession from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * 페이지의 메타데이터를 생성
 * 검색 엔진 최적화를 위해 별도의 가벼운 타이틀 조회 함수를 사용
 */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  // 캐시된 상세 데이터 재사용 (Service 내부에서 dedup됨)
  const product = await getCachedProduct(id);

  if (!product) {
    return { title: "제품을 찾을 수 없음" };
  }

  return {
    title: product.title,
    description: product.description?.slice(0, 100), // 본문 앞 100자 요약
    openGraph: {
      title: product.title,
      description: product.description?.slice(0, 100),
      // images: [] <-- 이건 opengraph-image.tsx가 자동으로 채워줌
    },
  };
}

/**
 * 제품 상세 페이지
 *
 * [기능]
 * 1. 조회수 증가 로직을 가장 먼저 실행하여 캐시 무효화를 선행
 * 2. 최신화된 제품 정보와 유저의 좋아요 상태를 병렬로 조회
 * 3. 쿨다운 정책에 따라 조회수가 실제로 증가했다면 화면 표시값을 +1 보정
 */
export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (isNaN(id)) return notFound();

  const session = await getSession();
  const userId = session?.id ?? null;

  // 비로그인 접근 제한
  if (!userId) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/products/view/${id}`)}`
    );
  }

  // 1. 조회수 증가 및 무효화 선행 (3분 쿨다운 적용)
  await incrementViews({
    target: "PRODUCT",
    targetId: id,
    viewerId: userId,
  });

  // 2. 상세 정보 및 상호작용 상태 병렬 조회
  const [product, likeStatus] = await Promise.all([
    getCachedProduct(id),
    getCachedProductLikeStatus(id, userId),
  ]);

  if (!product) return notFound();

  // 3. 차단 관계 확인 (본인이 아닐 경우)
  // 판매자(product.userId)와 나(userId) 사이에 차단이 있으면 접근 불가
  if (userId && userId !== product.userId) {
    const isBlocked = await checkBlockRelation(userId, product.userId);
    if (isBlocked) {
      const callbackUrl = `/products/view/${id}`;
      redirect(
        `/403?reason=BLOCKED` +
          `&username=${encodeURIComponent(product.user.username)}` +
          `&callbackUrl=${encodeURIComponent(callbackUrl)}`
      );
    }
  }

  const isOwner = !!userId && userId === product.userId;

  return (
    <ProductDetailContainer
      product={product}
      views={product.views}
      isOwner={isOwner}
      likeCount={likeStatus.likeCount}
      isLiked={likeStatus.isLiked}
    />
  );
}
