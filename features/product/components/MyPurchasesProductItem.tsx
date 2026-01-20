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
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReview } from "@/features/review/hooks/useReview";
import { formatToWon } from "@/lib/utils";
import { deleteReview } from "@/features/review/lib/deleteReview";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import CreateReviewModal from "@/features/user/components/profile/CreateReviewModal";
import ReviewDetailModal from "@/features/user/components/profile/ReviewDetailModal";
import type { MyPurchasedListItem, ProductReview } from "@/types/product";

type Props = {
  product: MyPurchasedListItem;
  onReviewChanged?: (patch: Partial<MyPurchasedListItem>) => void;
};

export default function MyPurchasesProductItem({
  product,
  onReviewChanged,
}: Props) {
  const [modalState, setModalState] = useState({
    create: false,
    viewMine: false,
    viewSeller: false,
    deleteConfirm: false,
  });

  const toggleModal = (key: keyof typeof modalState, open: boolean) => {
    setModalState((prev) => ({ ...prev, [key]: open }));
  };

  const [isDeleting, setIsDeleting] = useState(false);
  /**
   * 리뷰는 로컬 state로 관리
   * - 작성/삭제 즉시 UI에 반영
   * - onReviewChanged patch도 항상 "최신(prev)" 기반으로 생성(스테일 방지)
   */
  const [reviews, setReviews] = useState<ProductReview[]>(
    product.reviews ?? []
  );

  // 상위 리스트(updateOne)나 서버 리페치 등으로 product.reviews가 갱신되면 동기화
  useEffect(() => {
    setReviews(product.reviews ?? []);
  }, [product.reviews]);

  const buyerUserId = product.purchase_userId;

  const buyerReview = useMemo(
    () => reviews.find((r) => r.userId === buyerUserId),
    [reviews, buyerUserId]
  );

  const sellerReview = useMemo(
    () => reviews.find((r) => r.userId !== buyerUserId),
    [reviews, buyerUserId]
  );

  const { isLoading: isSubmitting, submitReview } = useReview({
    productId: product.id,
    type: "buyer",
    onSuccess: (newReview) => {
      setReviews((prev) => {
        const next = [
          newReview,
          ...prev.filter((r) => r.userId !== buyerUserId),
        ];
        onReviewChanged?.({ reviews: next });
        return next;
      });
      toggleModal("create", false);
    },
  });

  const confirmDeleteReview = async () => {
    if (!buyerReview?.id) return;
    try {
      setIsDeleting(true);
      await deleteReview(buyerReview.id);
      setReviews((prev) => {
        const next = prev.filter((r) => r.id !== buyerReview.id);
        onReviewChanged?.({ reviews: next });
        return next;
      });
      toggleModal("viewMine", false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      toggleModal("deleteConfirm", false);
    }
  };

  const sellerName = product.user?.username ?? "판매자";
  const thumbUrl = product.images?.[0]?.url
    ? `${product.images[0].url}/public`
    : null;
  const href = `/products/view/${product.id}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:shadow-md">
      <div className="flex p-4 gap-4">
        {/* Thumbnail */}
        <Link
          href={href}
          className="relative shrink-0 size-24 sm:size-28 rounded-xl overflow-hidden bg-surface-dim"
        >
          {thumbUrl ? (
            <Image
              fill
              src={thumbUrl}
              alt={product.title}
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted text-xs">
              No Image
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start gap-2">
              <Link href={href} className="min-w-0">
                <h3 className="truncate text-base font-semibold text-primary leading-tight group-hover:text-brand transition-colors">
                  {product.title}
                </h3>
              </Link>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                구매완료
              </span>
            </div>
            <div className="text-sm font-bold text-brand dark:text-brand-light mt-1">
              {formatToWon(product.price)}원
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">판매자</span>
              <UserAvatar
                avatar={product.user?.avatar}
                username={sellerName}
                size="sm"
                compact
              />
            </div>
            {product.purchased_at && (
              <span className="text-xs text-muted">
                <TimeAgo date={product.purchased_at.toString()} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-surface-dim/30">
        {buyerReview ? (
          <button
            onClick={() => toggleModal("viewMine", true)}
            className="py-3 text-sm font-medium text-primary hover:bg-surface-dim transition-colors"
          >
            내 리뷰 보기
          </button>
        ) : (
          <button
            onClick={() => toggleModal("create", true)}
            disabled={isSubmitting}
            className="py-3 text-sm font-medium text-brand dark:text-brand-light hover:bg-brand/5 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "작성 중..." : "리뷰 작성하기"}
          </button>
        )}

        <button
          onClick={() => toggleModal("viewSeller", true)}
          className="py-3 text-sm font-medium text-muted hover:text-primary hover:bg-surface-dim transition-colors"
        >
          판매자 리뷰
        </button>
      </div>

      {/* Modals */}
      <CreateReviewModal
        isOpen={modalState.create}
        onClose={() => toggleModal("create", false)}
        onSubmit={(text, rate) => submitReview(text, rate).then((r) => r.ok)}
        username={sellerName}
        userAvatar={product.user?.avatar ?? null}
      />

      <ReviewDetailModal
        isOpen={modalState.viewMine}
        onClose={() => toggleModal("viewMine", false)}
        title="내가 쓴 리뷰"
        review={buyerReview}
        onDelete={() => toggleModal("deleteConfirm", true)}
      />

      <ReviewDetailModal
        isOpen={modalState.viewSeller}
        onClose={() => toggleModal("viewSeller", false)}
        title={`${sellerName}님의 리뷰`}
        review={sellerReview}
        emptyMessage={`${sellerName}님이 아직 리뷰를 작성하지 않았습니다.`}
      />

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
