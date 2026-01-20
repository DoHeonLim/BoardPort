/**
 File Name : app/(tabs)/products/@modal/(..)products/view/[id]/page
 Description : products/view/[id] 인터셉트 후 모달 페이지
 Author : 임도헌

 History
 Date        Author   Status    Description
 2024.10.22  임도헌   Created
 2024.10.22  임도헌   Modified  모달 페이지 추가(페러렐 라우트)
 2024.11.02  임도헌   Modified  제품 삭제 버튼 편집 페이지로 옮김
 2024.11.08  임도헌   Modified  채팅방 생성 함수 추가
 2024.11.11  임도헌   Modified  클라우드 플레어 이미지 variants 추가
 2024.11.15  임도헌   Modified  본인이라면 채팅하기 버튼 필요 없으므로 코드 수정
 2024.11.21  임도헌   Modified  Chatroom을 productChatRoom으로 변경
 2024.11.21  임도헌   Modified  제품 제목이나 내용이 길어질 경우 창이 커지는 것 수정
 2024.12.05  임도헌   Modified  제품 상세 페이지 판매 여부 추가
 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 2024.12.12  임도헌   Modified  제품 이미지 캐러셀로 변경
 2024.12.12  임도헌   Modified  제품 생성 시간 표시 변경
 2024.12.15  임도헌   Modified  보드포트 컨셉으로 스타일 변경
 2024.12.16  임도헌   Modified  제품 조회수 추가
 2024.12.17  임도헌   Modified  서버코드 모두 app/products/[id]/actions로 이동
 2025.04.13  임도헌   Modified  completeness 필드를 영어로 변경
 2025.04.13  임도헌   Modified  condition 필드를 영어로 변경
 2025.04.13  임도헌   Modified  game_type 필드를 영어로 변경
 2025.06.08  임도헌   Modified  데이터 fetch와 UI 컨테이너로 분리 리팩토링
 2025.06.12  임도헌   Modified  app/(tabs)/products/@modal/(..)products/view/[id]/page로 이동
 2026.01.04  임도헌   Modified  getProductDetailData가 redirect/조회수/개인화를 포함 → 모달도 force-dynamic + revalidate=0 명시
 */

import { notFound } from "next/navigation";
import { getProductDetailData } from "@/features/product/lib/getProductDetailData";
import ProductDetailModalContainer from "@/features/product/components/productDetail/modal/ProductDetailModalContainer";

/**
 * NOTE:
 * - getProductDetailData()는 로그인 강제(redirect) + 조회수 증가(incrementViews) + 좋아요/오너 개인화를 포함한다.
 * - 따라서 인터셉트 모달 라우트도 정적/ISR로 두면 부작용/불안정이 생길 수 있어 동적 페이지로 고정한다.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProductDetailModalProps {
  params: { id: string };
}

export default async function ProductDetailModal({
  params,
}: ProductDetailModalProps) {
  const id = Number(params.id);
  const data = await getProductDetailData(id);
  if (!data) return notFound();

  return <ProductDetailModalContainer {...data} />;
}
