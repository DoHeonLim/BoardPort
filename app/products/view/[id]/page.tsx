/**
File Name : app/products/view/[id]/page
Description : 제품 상세 페이지
Author : 임도헌

History
Date        Author   Status    Description
2024.10.14  임도헌   Created
2024.10.14  임도헌   Modified  제품 상세 페이지 추가
2024.10.17  임도헌   Modified  이미지 object-cover로 변경
2024.10.17  임도헌   Modified  제품 삭제 기능 추가
2024.10.26  임도헌   Modified  메타데이터 추가
2024.11.02  임도헌   Modified  제품 삭제 버튼 편집 페이지로 옮김
2024.11.09  임도헌   Modified  제품 채팅방 생성 함수 추가
2024.11.11  임도헌   Modified  클라우드 플레어 이미지 variants 추가
2024.11.15  임도헌   Modified  본인이라면 채팅하기 버튼 필요 없으므로 코드 수정, 캐싱 기능 추가
2024.11.21  임도헌   Modified  Chatroom을 productChatRoom으로 변경
2024.12.05  임도헌   Modified  제품 상세 페이지 판매 여부 추가
2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
2024.12.11  임도헌   Modified  제품 사진 캐러셀 추가
2024.12.11  임도헌   Modified  제품 좋아요 추가
2024.12.11  임도헌   Modified  뒤로가기 버튼 추가
2024.12.12  임도헌   Modified  제품 생성 시간 표시 변경
2024.12.14  임도헌   Modified  getProduct 함수 수정(조회수 증가)
2024.12.16  임도헌   Modified  제품 조회수 업데이트 함수 추가
2024.12.16  임도헌   Modified  제품 상세를 보드게임 제품 형식으로 변경
2024.12.17  임도헌   Modified  서버코드 모두 app/products/[id]/actions로 이동
2024.12.22  임도헌   Modified  채팅방 생성 함수 변경, 제품 캐싱 함수 변경
2024.12.25  임도헌   Modified  제품 상세 페이지 다크모드 추가
2024.12.25  임도헌   Modified  제품 상세 정보 컴포넌트 분리
2025.04.13  임도헌   Modified  completeness 필드를 영어로 변경
2025.04.13  임도헌   Modified  condition 필드를 영어로 변경
2025.04.13  임도헌   Modified  game_type 필드를 영어로 변경
2025.06.08  임도헌   Modified  데이터 fetch와 UI 컨테이너로 분리 리팩토링
2025.11.13  임도헌   Modified  뒤로가기 layout으로 위임
2026.01.04  임도헌   Modified  generateMetadata에서 getProductDetailData 호출 제거(redirect/조회수/개인화 부작용 방지) → title 전용 fetch로 분리
*/

import { notFound } from "next/navigation";
import { getProductDetailData } from "@/features/product/lib/getProductDetailData";
import { getProductTitleForMetadata } from "@/features/product/lib/getProductTitleForMetadata";
import ProductDetailContainer from "@/features/product/components/productDetail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  // NOTE:
  // getProductDetailData()는 로그인 redirect + 조회수 증가 + 좋아요/오너 개인화를 포함하므로
  // metadata 경로에서 호출하면 의도치 않은 부작용이 생길 수 있다.
  // → title 전용 fetch로 분리하여 안정성/비용을 개선한다.
  const title = await getProductTitleForMetadata(id);

  return {
    title: title || "제품 상세",
  };
}

interface ProductDetailPageProps {
  params: { id: string };
}

export default async function ProductDetail({
  params,
}: ProductDetailPageProps) {
  const id = Number(params.id);
  const data = await getProductDetailData(id);
  if (!data) return notFound();

  return <ProductDetailContainer {...data} />;
}
