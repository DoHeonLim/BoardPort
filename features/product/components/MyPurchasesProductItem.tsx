/**
 * File Name : features/product/components/MyPurchasesProductItem.tsx
 * Description : 프로필 나의 구매 제품 아이템 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.03  임도헌   Created
 * 2024.12.03  임도헌   Modified  나의 구매 제품 아이템 컴포넌트 추가
 * 2024.12.03  임도헌   Modified  거래 후기 작성 모달 추가
 * 2024.12.03  임도헌   Modified  구매자, 판매자 리뷰 모달 추가
 * 2024.12.03  임도헌   Modified  로딩 및 에러 처리 추가
 * 2024.12.12  임도헌   Modified  photo속성에서 images로 변경
 * 2024.12.12  임도헌   Modified  제품 상태 변경 시간 표시 변경
 * 2024.12.22  임도헌   Modified  오타 수정
 * 2024.12.24  임도헌   Modified  다크모드 적용
 * 2024.12.29  임도헌   Modified  나의 구매 제품 아이템 컴포넌트 스타일 수정
 * 2025.10.17  임도헌   Modified  lib/review 경로로 교체, /products/view 경로 통일, 이미지 /public
 * 2025.11.02  임도헌   Modified  썸네일 안전화(빈 src 방지 + 스켈레톤), TimeAgo 타입 안전화, a11y 라벨 보강
 * 2025.11.06  임도헌   Modified  ConfirmDialog로 리뷰 삭제 일원화 + 삭제 로딩/닫힘 제어 + onReviewChanged 유지
 * 2025.12.31  임도헌   Modified  리뷰를 로컬 state로 관리하여 작성/삭제 patch를 최신 상태 기준으로 통일(스테일 patch 방지)
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 & 반응형 레이아웃 적용
 * 2026.01.16  임도헌   Modified  ProductCard 스타일 통일
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.02.27  임도헌   Modified  모달 Dynamic Import 적용 및 본인 리뷰 신고 방지 적용
 * 2026.03.07  임도헌   Modified  리뷰 삭제 실패 피드백 문구를 구체화(v1.2)
 * 2026.03.12  임도헌   Modified  사용자 업로드 GIF만 썸네일 최적화 예외 처리하도록 이미지 메타 연동
 * 2026.03.12  임도헌   Modified  프로필 구매 카드 구분선을 border-border-subtle 톤으로 통일
 * 2026.03.13  임도헌   Modified  구매 내역에서 제품 상세 진입 시 현재 경로를 returnTo로 함께 전달
 * 2026.03.18  임도헌   Modified  구매 내역 현재 경로도 내부 경로 기준으로 정규화해 nested returnTo 예외를 완화
 * 2026.03.26  임도헌   Modified  카드 정보 위계와 구매 메타 영역을 최근 프로필 제품 패턴에 맞게 정리
 * 2026.03.26  임도헌   Modified  구매 카드의 상태 pill, 메타행, 리뷰 액션 위계를 arrange/quieter 기준으로 정리
 * 2026.03.26  임도헌   Modified  내 판매 카드 패턴에 맞춰 게임/카테고리 태그를 구매 카드에도 노출
 * 2026.03.26  임도헌   Modified  구매 카드 액션바 톤을 판매 완료 카드와 같은 위계로 정리
 * 2026.04.02  임도헌   Modified  제품 이미지 public variant 처리 유틸 공용화
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { EyeIcon, HeartIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { formatToWon } from "@/lib/utils";
import { GAME_TYPE_DISPLAY } from "@/features/product/constants";
import { useReview } from "@/features/review/hooks/useReview";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { deleteReviewAction } from "@/features/review/actions/delete";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { toProductImagePublicUrl } from "@/features/product/utils/image";
import type { GameType, MyPurchasedListItem } from "@/features/product/types";
import type { ProductReview } from "@/features/review/types";
import dynamic from "next/dynamic";

const CreateReviewModal = dynamic(
  () => import("@/features/user/components/profile/CreateReviewModal"),
  { ssr: false }
);
const ReviewDetailModal = dynamic(
  () => import("@/features/user/components/profile/ReviewDetailModal"),
  { ssr: false }
);

type Props = {
  product: MyPurchasedListItem;
  onReviewChanged?: (patch: Partial<MyPurchasedListItem>) => void;
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-border bg-surface-dim px-2.5 py-1 text-[11px] font-semibold leading-none text-primary shadow-sm">
      {children}
    </span>
  );
}

function PurchasePill() {
  return (
    <span className="rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-sm bg-neutral-500">
      구매완료
    </span>
  );
}

function Metric({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      {icon} {children}
    </span>
  );
}

/**
 * 내 구매 목록의 개별 아이템 카드
 *
 * [기능]
 * 1. 구매한 제품 정보(제목, 가격, 썸네일) 및 판매자 정보 표시
 * 2. 판매자 리뷰 관련 기능 제공:
 *    - 리뷰 작성 (구매자 -> 판매자)
 *    - 내 리뷰 보기/삭제
 *    - 판매자가 남긴 리뷰 보기
 * 3. 각종 모달(작성, 상세, 삭제확인) 상태 관리
 */
export default function MyPurchasesProductItem({
  product,
  onReviewChanged,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 모달 상태 관리
  const [modalState, setModalState] = useState({
    create: false, // 리뷰 작성 모달
    viewMine: false, // 내 리뷰 보기 모달
    viewSeller: false, // 판매자 리뷰 보기 모달
    deleteConfirm: false, // 삭제 확인 다이얼로그
  });

  const toggleModal = (key: keyof typeof modalState, open: boolean) => {
    setModalState((prev) => ({ ...prev, [key]: open }));
  };

  const [isDeleting, setIsDeleting] = useState(false);

  // 리뷰 목록 로컬 상태 관리 (실시간 반영용)
  const [reviews, setReviews] = useState<ProductReview[]>(
    product.reviews ?? []
  );

  // 상위에서 props가 갱신되면 로컬 상태 동기화
  useEffect(() => {
    setReviews(product.reviews ?? []);
  }, [product.reviews]);

  const buyerUserId = product.purchase_userId;

  // 내가 쓴 리뷰 (구매자 리뷰)
  const buyerReview = useMemo(
    () => reviews.find((r) => r.userId === buyerUserId),
    [reviews, buyerUserId]
  );

  // 판매자가 쓴 리뷰
  const sellerReview = useMemo(
    () => reviews.find((r) => r.userId !== buyerUserId),
    [reviews, buyerUserId]
  );

  // 리뷰 작성 훅 사용
  const { isLoading: isSubmitting, submitReview } = useReview({
    productId: product.id,
    type: "buyer", // 구매자 입장에서 작성
    onSuccess: (newReview) => {
      setReviews((prev) => {
        // 기존 내 리뷰 제거하고 새 리뷰 추가 (덮어쓰기)
        const next = [
          newReview,
          ...prev.filter((r) => r.userId !== buyerUserId),
        ];
        onReviewChanged?.({ reviews: next }); // 리스트 상위 컴포넌트에 알림
        return next;
      });
      toggleModal("create", false);
    },
  });

  // 리뷰 삭제 핸들러
  const confirmDeleteReview = async () => {
    if (!buyerReview?.id) return;
    try {
      setIsDeleting(true);
      const res = await deleteReviewAction(buyerReview.id);
      if (res.success) {
        setReviews((prev) => {
          const next = prev.filter((r) => r.id !== buyerReview.id);
          onReviewChanged?.({ reviews: next });
          return next;
        });
        toast.success("리뷰를 삭제했습니다.");
        toggleModal("viewMine", false); // 상세 모달도 같이 닫기
      } else {
        toast.error(
          res.error ??
            "리뷰 삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(
        "리뷰 삭제 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
      );
    } finally {
      setIsDeleting(false);
      toggleModal("deleteConfirm", false);
    }
  };

  const sellerName = product.user?.username ?? "판매자";
  const thumbUrl = toProductImagePublicUrl(product.images?.[0]?.url);
  const metaChips = useMemo(() => {
    const chips = [];
    const gameType = product.game_type as GameType;

    if (gameType && GAME_TYPE_DISPLAY[gameType]) {
      chips.push(GAME_TYPE_DISPLAY[gameType]);
    }

    if (product.category?.kor_name) {
      chips.push(product.category.kor_name);
    }

    return chips;
  }, [product.category?.kor_name, product.game_type]);
  const currentQuery = searchParams.toString();
  // 상세 재진입 링크도 현재 목록 문맥을 내부 경로 기준으로만 전달
  const returnTo = sanitizeCallbackUrl(
    currentQuery ? `${pathname}?${currentQuery}` : pathname
  );
  const href = `/products/view/${product.id}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm transition hover:shadow-md">
      {/* 제품 정보 영역 (클릭 시 상세 이동) */}
      <div className="flex gap-3 p-4 sm:gap-4">
        {/* Thumbnail */}
        <Link
          href={href}
          className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-dim sm:size-28"
        >
          {thumbUrl ? (
            <Image
              fill
              src={thumbUrl}
              alt={product.title}
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized={!!product.images[0]?.isAnimated}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted text-xs">
              No Image
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-2">
              <Link href={href} className="block min-w-0 flex-1">
                <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-primary transition-colors group-hover:text-brand sm:line-clamp-1 sm:text-base sm:leading-6">
                  {product.title}
                </h3>
              </Link>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-start">
                <PurchasePill />
                <UserAvatar
                  avatar={product.user?.avatar}
                  username={sellerName}
                  size="sm"
                  compact
                />
              </div>
            </div>
            <div className="mt-1 text-sm font-bold text-brand dark:text-brand-light sm:text-base">
              {formatToWon(product.price)}원
            </div>
            {metaChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {metaChips.map((chip) => (
                  <Chip key={chip}>{chip}</Chip>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border-subtle pt-1 text-[10px] text-muted sm:text-xs">
            <div className="flex gap-3">
              <Metric icon={<HeartIcon className="size-3.5 text-rose-500" />}>
                {product._count.product_likes ?? 0}
              </Metric>
              <Metric icon={<EyeIcon className="size-3.5" />}>
                {product.views ?? 0}
              </Metric>
            </div>
            {product.purchased_at && (
              <TimeAgo date={product.purchased_at.toString()} />
            )}
          </div>
        </div>
      </div>

      {/* Actions (리뷰 관리) */}
      <div className="grid grid-cols-2 divide-x divide-border-subtle border-t border-border-subtle bg-surface-dim/30">
        {buyerReview ? (
          <button
            onClick={() => toggleModal("viewMine", true)}
            className="py-3 text-xs font-medium text-primary transition-colors hover:bg-surface-dim sm:text-sm"
          >
            내 리뷰 보기
          </button>
        ) : (
          <button
            onClick={() => toggleModal("create", true)}
            disabled={isSubmitting}
            className="py-3 text-xs font-medium text-brand transition-colors hover:bg-brand/5 disabled:opacity-50 dark:text-brand-light dark:hover:bg-brand-light/10 sm:text-sm"
          >
            {isSubmitting ? "작성 중..." : "리뷰 작성하기"}
          </button>
        )}

        <button
          onClick={() => toggleModal("viewSeller", true)}
          className="py-3 text-xs font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary sm:text-sm"
        >
          판매자 리뷰
        </button>
      </div>

      {/* Modals */}

      {/* 1. 리뷰 작성 */}
      <CreateReviewModal
        isOpen={modalState.create}
        onClose={() => toggleModal("create", false)}
        onSubmit={(text, rate) => submitReview(text, rate).then((r) => r.ok)}
        username={sellerName}
        userAvatar={product.user?.avatar ?? null}
      />

      {/* 2. 내 리뷰 상세/삭제 */}
      <ReviewDetailModal
        isOpen={modalState.viewMine}
        onClose={() => toggleModal("viewMine", false)}
        title="내가 쓴 리뷰"
        review={buyerReview}
        onDelete={() => toggleModal("deleteConfirm", true)}
        isOwnReview={true}
      />

      {/* 3. 판매자 리뷰 조회 */}
      <ReviewDetailModal
        isOpen={modalState.viewSeller}
        onClose={() => toggleModal("viewSeller", false)}
        title={`${sellerName}님의 리뷰`}
        review={sellerReview}
        emptyMessage={`${sellerName}님이 아직 리뷰를 작성하지 않았습니다.`}
      />

      {/* 4. 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={modalState.deleteConfirm}
        onCancel={() => toggleModal("deleteConfirm", false)}
        onConfirm={confirmDeleteReview}
        loading={isDeleting}
        title="리뷰 삭제"
        description="작성한 리뷰를 삭제하시겠습니까?"
        confirmLabel="삭제"
      />
    </div>
  );
}
