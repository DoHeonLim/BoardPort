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
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { formatToWon } from "@/lib/utils";
import { useReview } from "@/features/review/hooks/useReview";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import CreateReviewModal from "@/features/user/components/profile/CreateReviewModal";
import ReviewDetailModal from "@/features/user/components/profile/ReviewDetailModal";
import { deleteReviewAction } from "@/features/review/actions/delete";
import type { MyPurchasedListItem } from "@/features/product/types";
import type { ProductReview } from "@/features/review/types";

type Props = {
  product: MyPurchasedListItem;
  onReviewChanged?: (patch: Partial<MyPurchasedListItem>) => void;
};

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
        toast.error(res.error || "삭제 실패");
      }
    } catch (e) {
      console.error(e);
      toast.error("오류가 발생했습니다.");
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
      {/* 제품 정보 영역 (클릭 시 상세 이동) */}
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

      {/* Actions (리뷰 관리) */}
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
