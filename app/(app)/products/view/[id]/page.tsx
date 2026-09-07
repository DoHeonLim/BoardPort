/**
 * File Name : app/(app)/products/view/[id]/page.tsx
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
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.13  임도헌   Modified  상세 진입 returnTo를 로그인/차단 가드 callbackUrl에 반영
 * 2026.03.14  임도헌   Modified  제품 상세 헤더를 페이지 내부로 이동해 수정/모달 흐름과 분리
 * 2026.03.18  임도헌   Modified  returnTo 미지정 시 제품 목록(/products)으로 복귀하도록 기본 경로 고정
 * 2026.04.06  임도헌   Modified  owner 전용 수정/삭제를 상단 관리 메뉴로 이동
 * 2026.04.09  임도헌   Modified  판매완료 숨김 상품은 판매자/구매자만 상세 접근 가능하도록 가드 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/products/view/[id]/page.tsx 에서 app/(app)/products/view/[id]/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  상세/모달 공통 상세 로더를 적용하고 조회수 반영 시점을 가드 이후로 조정
 * 2026.05.15  임도헌   Modified  제품 공유 미리보기용 OG 이미지 메타와 소셜 크롤러 접근 분기 추가
 * 2026.05.30  임도헌   Modified  제품 상세 상단 액션바 높이와 좌우 여백을 압축
 * 2026.06.17  임도헌   Modified  제품 좋아요 상태 캐시를 조회자 기준으로 분리하도록 viewerId 전달
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.09.03  임도헌   Modified  새 탭 직접 진입에서도 상세 헤더가 계산된 returnTo로 복귀하도록 보강
 */

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  getProductDetailViewData,
  getProductTitleById,
} from "@/features/product/service/detail";
import { incrementViews } from "@/features/common/service/view";
import ProductDetailContainer from "@/features/product/components/productDetail";
import ProductOwnerMenu from "@/features/product/components/productDetail/ProductOwnerMenu";
import ProductOptionMenu from "@/features/product/components/productDetail/ProductOptionMenu";
import ProductShareButton from "@/features/product/components/ProductShareButton";
import BackButton from "@/components/global/BackButton";
import getSession from "@/lib/session";
import { isSocialCrawlerUserAgent } from "@/lib/socialCrawler";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 페이지의 메타데이터를 생성
 * 검색 엔진 최적화를 위해 별도의 가벼운 타이틀 조회 함수를 사용
 */
export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { title: "상품을 찾을 수 없음" };
  }
  const product = await getProductTitleById(id);

  if (!product) {
    return { title: "상품을 찾을 수 없음" };
  }
  if (product.hidden_at) {
    return { title: "상품을 찾을 수 없음" };
  }
  // 본문 앞 100자 요약. 비어 있으면 공유 카드가 루트 기본 설명으로 떨어지지 않도록 고정 문구 사용
  const desc =
    product.description?.trim().slice(0, 100).replace(/\s+/g, " ") ||
    "보드포트 상품 상세를 확인해보세요.";
  // 외부 공유 크롤러가 안정적으로 읽을 수 있도록 고정 route handler URL 사용
  const imageUrl = `/products/view/${id}/og-image`;

  return {
    title: product.title,
    description: desc,
    openGraph: {
      title: product.title,
      description: desc,
      url: `/products/view/${id}`,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${product.title} 상품 미리보기`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: desc,
      images: [imageUrl],
    },
  };
}

/**
 * 제품 상세 페이지
 *
 * [기능]
 * - 로그인 세션 확인 및 비인가 사용자 리다이렉트 처리
 * - 공통 상세 로더로 본문 데이터와 개인화 상태(좋아요/차단 여부)를 함께 조회
 * - 판매자와 조회자 간의 양방향 차단 관계 검증 (차단 시 403 리다이렉트 처리)
 * - 가드를 통과한 실제 진입에 한해서만 조회수를 증가시키고 현재 렌더 값에 즉시 반영
 * - `returnTo`가 없을 경우 제품 목록(`/products`)을 기본 복귀 경로로 사용
 *
 * @param props - 제품 ID와 복귀 경로를 담은 Promise 기반 라우트 속성
 */
export default async function ProductDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return notFound();
  // 상세 직접 진입 시 기본 복귀 경로를 제품 목록으로 고정
  const returnTo = sanitizeCallbackUrl(searchParams?.returnTo ?? "/products");
  const detailHref = `/products/view/${id}?returnTo=${encodeURIComponent(
    returnTo
  )}`;

  const session = await getSession();
  const userId = session?.id ?? null;
  const isSharePreviewCrawler = isSocialCrawlerUserAgent(
    (await headers()).get("user-agent")
  );

  // 비로그인 사용자는 로그인으로 보내되, 공유 미리보기 크롤러는 로그인 리다이렉트 생략
  if (!userId && !isSharePreviewCrawler) {
    redirect(`/login?callbackUrl=${encodeURIComponent(detailHref)}`);
  }

  // 공통 로더를 통한 본문/좋아요/차단 상태 일괄 정리 및 페이지/모달 로직 정렬
  const { product, likeStatus, isOwner, isBlocked } =
    await getProductDetailViewData(id, userId);

  if (!product) return notFound();

  const isBuyer = !!userId && userId === product.purchase_userId;
  if (product.hidden_at && !isOwner && !isBuyer) {
    return notFound();
  }

  if (isBlocked) {
    redirect(
      `/403?reason=BLOCKED` +
        `&username=${encodeURIComponent(product.user.username)}` +
        `&callbackUrl=${encodeURIComponent(detailHref)}`
    );
  }

  // notFound/403 가드 통과한 실제 진입만 조회수 반영, 화면 값 즉시 보정
  const counted = await incrementViews({
    target: "PRODUCT",
    targetId: id,
    viewerId: userId,
  });
  const currentViews = counted ? (product.views ?? 0) + 1 : product.views;

  return (
    <div className="min-h-screen bg-background text-primary transition-colors">
      <header
        className="sticky top-0 z-40 h-[52px] w-full border-b border-border-subtle bg-background shadow-sm transition-colors"
        role="banner"
      >
        <div className="mx-auto flex h-full max-w-mobile items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <BackButton
              fallbackHref={returnTo}
              preferFallback
              variant="appbar"
            />
          </div>

          <div className="flex items-center gap-1">
            {product.categoryId && product.category?.kor_name && (
              <Link
                href={`/products?category=${encodeURIComponent(
                  String(product.categoryId)
                )}`}
                className={cn(
                  "appbar-chip focus-ring-soft hidden xs:inline-flex",
                  "bg-surface-dim text-muted hover:bg-surface hover:text-primary border border-transparent hover:border-border"
                )}
                aria-label={`카테고리 ${product.category.kor_name}로 보기`}
              >
                {product.category.icon && <span>{product.category.icon}</span>}
                {product.category.kor_name}
              </Link>
            )}

            <ProductShareButton title={product.title || "보드포트 상품"} />

            {isOwner ? (
              <ProductOwnerMenu
                productId={id}
                isSold={!!product.purchase_userId}
                isHidden={!!product.hidden_at}
              />
            ) : (
              <ProductOptionMenu
                productId={id}
                sellerId={product.userId}
                sellerName={product.user.username}
              />
            )}
          </div>
        </div>
      </header>

      <ProductDetailContainer
        product={product}
        views={currentViews}
        isOwner={isOwner}
        likeCount={likeStatus.likeCount}
        isLiked={likeStatus.isLiked}
        viewerId={userId}
      />
    </div>
  );
}
