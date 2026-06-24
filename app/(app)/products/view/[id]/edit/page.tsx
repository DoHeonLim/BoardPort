/**
 * File Name : app/(app)/products/view/[id]/edit/page.tsx
 * Description : 제품 편집 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.02  임도헌   Created
 * 2024.11.02  임도헌   Modified  제품 편집 페이지 추가
 * 2024.12.12  임도헌   Modified  제품 대표 사진 하나 들고오기
 * 2024.12.19  임도헌   Modified  보드게임 형식으로 수정
 * 2024.12.19  임도헌   Modified  타입 정의 추가
 * 2024.12.29  임도헌   Modified  보드포트 형식에 맞게 제품 수정 폼 변경
 * 2025.04.18  임도헌   Modified  삭제하기 버튼 마진 삭제
 * 2025.06.15  임도헌   Modified  제품 등록 및 편집 폼 통합
 * 2025.07.06  임도헌   Modified  getIsOwner함수 lib로 이동
 * 2025.07.30  임도헌   Modified  fetchProductCategories로 이름 변경
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 레이아웃 적용
 * 2026.01.22  임도헌   Modified  Service 직접 호출 기준으로 정리
 * 2026.01.26  임도헌   Modified  주석 설명 보강
 * 2026.03.05  임도헌   Modified  getProductDetail함수로 변경 및 주석 최신화
 * 2026.03.09  임도헌   Modified  삭제 실패 시 편집 페이지에 잔류하며 에러 배너 표시
 * 2026.03.13  임도헌   Modified  삭제 완료 후 returnTo 복귀 경로를 우선 사용하도록 보강
 * 2026.03.13  임도헌   Modified  채팅 경로 returnTo는 삭제 완료 복귀에서 제외해 상품 목록으로 이동하도록 예외 처리
 * 2026.03.13  임도헌   Modified  모달 편집 흐름에서는 취소 시 목록 릴레이를 통해 모달 상세를 다시 열도록 조정
 * 2026.03.14  임도헌   Modified  제품 수정 헤더를 페이지 내부로 이동해 상세 헤더와 복귀 규칙을 분리
 * 2026.03.14  임도헌   Modified  삭제 액션을 확인 모달 기반으로 분리해 실수 방지 UX를 보강
 * 2026.03.17  임도헌   Modified  상세에서 진입한 편집 흐름은 삭제 후 목록 refresh 플래그를 함께 사용하도록 조정
 * 2026.03.18  임도헌   Modified  detail-edit/modal-edit의 비채팅 returnTo 복귀를 정규화된 안전 경로 기준으로 통일해 stale history와 목록 중복을 함께 방지
 * 2026.03.23  임도헌   Modified  제품 수정 페이지 id 가드를 상세 본문과 같은 유효 숫자/양수 기준으로 통일
 * 2026.03.26  임도헌   Modified  수정 CTA와 삭제 CTA 사이에 구분 여백을 추가해 긴 폼의 종료 지점 분리
 * 2026.04.06  임도헌   Modified  제품 삭제를 상세 owner 액션으로 이동해 수정 페이지는 편집 전용으로 단순화
 * 2026.04.10  임도헌   Modified  app 타이포 정책에 맞춰 제품 수정 상단 제목 weight를 500 기준으로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/products/view/[id]/edit/page.tsx 에서 app/(app)/products/view/[id]/edit/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  ProductForm이 mode 기반으로 내부 서버 액션을 선택하도록 정리해 action prop 전달 제거
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 옵션 주입
 * 2026.05.30  임도헌   Modified  제품 수정 상단 헤더 높이를 모바일 서브 헤더 기준으로 정리
 */

import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";
import ProductForm from "@/features/product/components/ProductForm";
import { fetchProductCategories } from "@/features/product/service/category";
import { convertProductToFormValues } from "@/features/product/utils/converter";
import { getProductDetail } from "@/features/product/service/detail";
import { getBoardGameRelationOptions } from "@/features/boardgame/service/publicQuery/relationOptions";
import BackButton from "@/components/global/BackButton";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 제품 수정 페이지
 *
 * [기능]
 * - URL 파라미터 기반 제품 상세 정보 서버 사이드 로드 적용
 * - 제품 소유자와 현재 로그인 세션 정보 비교를 통한 권한 검증
 * - 비인가 사용자(소유자가 아닌 경우) 접근 시 제품 목록 페이지로 리다이렉트 처리
 * - 서버에서 로드한 제품 정보를 클라이언트 폼 데이터 형식에 맞게 변환 및 주입
 */
export default async function EditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: {
    returnTo?: string;
    flow?: string;
  };
}) {
  const id = Number(params.id);
  const rawReturnTo = searchParams?.returnTo;
  const returnTo = rawReturnTo ? sanitizeCallbackUrl(rawReturnTo) : null;
  const isModalEditFlow = searchParams?.flow === "modal-edit";
  // 모달 진입 수정 흐름 취소 시 목록 복귀 및 reopen relay의 상세 재열림 가능 링크 구성
  const cancelHref =
    isModalEditFlow && returnTo
      ? `/products?openProductId=${id}&returnTo=${encodeURIComponent(returnTo)}`
      : `/products/view/${id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  if (!Number.isFinite(id) || id <= 0) return notFound();

  // 1. 제품 조회 및 권한 확인
  const product = await getProductDetail(id);
  if (!product) return notFound();

  const session = await getSession();
  const isOwner = session?.id === product.userId;
  if (!isOwner) redirect("/products");

  // 2. 데이터 준비
  const [categories, boardGameOptionsResult] = await Promise.all([
    fetchProductCategories(),
    getBoardGameRelationOptions(),
  ]);
  const defaultValues = convertProductToFormValues(product);

  return (
    <div className="min-h-screen bg-background text-primary transition-colors">
      <header
        className="sticky top-0 z-40 h-[52px] w-full border-b border-border-subtle bg-background shadow-sm transition-colors"
        role="banner"
      >
        <div className="mx-auto max-w-mobile h-full flex items-center gap-3 px-4">
          <BackButton
            fallbackHref={cancelHref}
            variant="appbar"
            className="px-0"
          />
          <h1 className="text-base font-medium text-primary">
            보드게임 제품 수정
          </h1>
        </div>
      </header>

      <div className="px-page-x py-page-y">
        <ProductForm
          mode="edit"
          defaultValues={defaultValues}
          categories={categories}
          boardGameOptions={
            boardGameOptionsResult.success ? boardGameOptionsResult.data : []
          }
          cancelHref={cancelHref}
        />
      </div>
    </div>
  );
}
