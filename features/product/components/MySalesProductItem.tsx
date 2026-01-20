/**
 * File Name : features/product/components/MySalesProductItem.tsx
 * Description : 나의 판매 제품 상세 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.30  임도헌   Created
 * 2024.11.30  임도헌   Modified  나의 판매 제품 상세 컴포넌트 추가
 * 2024.12.03  임도헌   Modified  purchase_at을 purchased_at으로 변경
 * 2024.12.05  임도헌   Modified  구매자 리뷰 볼 때 구매자가 누구인지 명시하는 코드 추가
 * 2024.12.12  임도헌   Modified  photo속성에서 images로 변경
 * 2024.12.12  임도헌   Modified  제품 상태 변경 시간 표시 변경
 * 2024.12.22  임도헌   Modified  페이지 디자인 변경, 리뷰 모달 구매자여야되는데 판매자로 되있어서 변경
 * 2024.12.24  임도헌   Modified  다크모드 적용
 * 2025.10.17  임도헌   Modified  lib/* 도메인 분리 + 직렬화 안전 타입 반영
 * 2025.10.17  임도헌   Modified  onMutateTabs 콜백 도입(탭간 동기화)
 * 2025.10.19  임도헌   Modified  낙관적 이동 + 실패 시 롤백/리프레시 연동
 * 2025.10.20  임도헌   Modified  ConfirmDialog로 경고 모달 통일 + 로딩/닫힘 제어 정리
 * 2025.10.20  임도헌   Modified  예약자 선택 onConfirm 위임 + reserved 경로 낙관 이동 추가
 * 2025.10.21  임도헌   Modified  UI 통일(상태Pill/메타칩/타임라인/상대방/지표 뱃지) 추가
 * 2025.11.06  임도헌   Modified  리뷰 삭제 확인을 ConfirmDialog로 일원화 + 삭제 로딩/닫힘 제어
 * 2025.12.30  임도헌   Modified  sold 낙관 이동 시 구매자 표시 동기화, 리뷰 삭제 patch를 로컬 최신 상태 기준으로 통일
 * 2026.01.03  임도헌   Modified  purchase_userId 기반 구매자 지연 조회를 getUserInfo(id) → getUserInfoById(id)로 변경(세션 불필요 경로 명확화)
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 & 반응형 레이아웃 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { formatToWon } from "@/lib/utils";
import { useReview } from "@/features/review/hooks/useReview";
import { GAME_TYPE_DISPLAY } from "@/lib/constants";
import { getUserInfoById } from "@/features/user/lib/getUserInfo";
import { updateProductStatus } from "@/features/product/lib/updateProductStatus";
import { deleteReview } from "@/features/review/lib/deleteReview";
import { deleteAllProductReviews } from "@/features/review/lib/deleteAllProductReviews";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import SelectUserModal from "@/features/user/components/profile/SelectUserModal";
import CreateReviewModal from "@/features/user/components/profile/CreateReviewModal";
import ReviewDetailModal from "@/features/user/components/profile/ReviewDetailModal";
import ReservationUserInfo from "@/features/user/components/profile/ReservationUserInfo";
import { EyeIcon, HeartIcon } from "@heroicons/react/24/solid";
import type { MySalesListItem, ProductReview } from "@/types/product";
import { cn } from "@/lib/utils";

type Tab = "selling" | "reserved" | "sold";

interface ProductItemProps {
  product: MySalesListItem;
  type?: Tab;
  userId: number;
  onOptimisticMove?: (p: {
    from: Tab;
    to: Tab;
    product: MySalesListItem;
    modifiedProduct?: MySalesListItem;
  }) => () => void;
  onMoveFailed?: (p: { from: Tab; to: Tab }) => Promise<void>;
  onReviewChanged?: (patch: Partial<MySalesListItem>) => void;
}

interface PurchaseUserInfo {
  username: string;
  avatar: string | null;
}

function StatusPill({ tab }: { tab?: Tab }) {
  if (!tab) return null;
  const styles = {
    selling: "bg-brand text-white",
    reserved: "bg-accent text-accent-foreground",
    sold: "bg-neutral-500 text-white",
  };
  const labels = {
    selling: "판매 중",
    reserved: "예약 중",
    sold: "판매 완료",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold shadow-sm",
        styles[tab]
      )}
    >
      {labels[tab]}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-surface-dim px-2 py-0.5 text-[10px] font-medium text-muted border border-border">
      {children}
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

export default function MySalesProductItem({
  product,
  type,
  userId,
  onOptimisticMove,
  onMoveFailed,
  onReviewChanged,
}: ProductItemProps) {
  const [modalState, setModalState] = useState({
    reservation: false,
    reviewCreate: false,
    reviewSeller: false, // 내가 쓴 리뷰 (판매자 -> 구매자)
    reviewBuyer: false, // 구매자가 쓴 리뷰
    warning: false,
    deleteConfirm: false,
  });

  const toggleModal = (key: keyof typeof modalState, open: boolean) => {
    setModalState((prev) => ({ ...prev, [key]: open }));
  };

  const [opLoading, setOpLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [purchaseUserInfo, setPurchaseUserInfo] = useState<PurchaseUserInfo>({
    username: product.purchase_user?.username ?? "",
    avatar: product.purchase_user?.avatar ?? null,
  });

  const [reviews, setReviews] = useState<ProductReview[]>(
    product.reviews ?? []
  );

  // 내가 쓴 리뷰 (판매자 -> 구매자)
  const sellerReviews = reviews.filter((r) => r.userId === userId);
  // 구매자가 쓴 리뷰 (구매자 -> 판매자)
  const buyerReviews = reviews.filter(
    (r) => r.userId === (product.purchase_userId ?? -1)
  );

  const { isLoading: reviewLoading, submitReview } = useReview({
    productId: product.id,
    type: "seller",
    onSuccess: (newReview) => {
      setReviews((prev) => {
        const next = [newReview, ...prev.filter((r) => r.userId !== userId)];
        onReviewChanged?.({ reviews: next });
        return next;
      });
      toggleModal("reviewCreate", false);
    },
  });

  useEffect(() => {
    if (product.reviews && product.reviews !== reviews) {
      setReviews(product.reviews);
    }
  }, [product.reviews, reviews]);

  // 구매자 정보 로딩
  useEffect(() => {
    const pUser = product.purchase_user;
    if (pUser) {
      setPurchaseUserInfo({ username: pUser.username, avatar: pUser.avatar });
    } else if (product.purchase_userId) {
      let mounted = true;
      getUserInfoById(product.purchase_userId).then((info) => {
        if (mounted && info) setPurchaseUserInfo(info);
      });
      return () => {
        mounted = false;
      };
    }
  }, [product.purchase_user, product.purchase_userId]);

  const handleSubmitReview = async (text: string, rating: number) => {
    const res = await submitReview(text, rating);
    return !!res.ok;
  };

  const confirmDeleteReview = async () => {
    try {
      const reviewId = sellerReviews[0]?.id;
      if (!reviewId) return;

      setIsDeleting(true);
      await deleteReview(reviewId);

      setReviews((prev) => {
        const next = prev.filter((r) => r.id !== reviewId);
        onReviewChanged?.({ reviews: next });
        return next;
      });
      toggleModal("reviewSeller", false);
      toast.success("리뷰를 삭제했습니다.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      toggleModal("deleteConfirm", false);
    }
  };

  // 낙관적 업데이트 로직 (간소화)
  const runWithOptimistic = useCallback(
    async (
      to: Tab,
      action: () => Promise<any>,
      modifiedProduct?: MySalesListItem
    ) => {
      if (!type) {
        setOpLoading(true);
        try {
          return await action();
        } finally {
          setOpLoading(false);
        }
      }
      const rollback = onOptimisticMove?.({
        from: type,
        to,
        product,
        modifiedProduct,
      });
      setOpLoading(true);
      try {
        const res = await action();
        if (!res?.success) throw new Error(res?.error || "실패");
        return res;
      } catch {
        rollback?.();
        await onMoveFailed?.({ from: type, to });
        toast.error("상태 변경 실패");
      } finally {
        setOpLoading(false);
      }
    },
    [onOptimisticMove, onMoveFailed, product, type]
  );

  const handleUpdateToSold = () =>
    runWithOptimistic("sold", () => updateProductStatus(product.id, "sold"));

  const updateToSelling = async () => {
    await runWithOptimistic("selling", async () => {
      const res = await updateProductStatus(product.id, "selling");
      if (res?.success) {
        await deleteAllProductReviews(product.id);
        toast.success("판매중으로 변경되었습니다.");
        setReviews([]);
        onReviewChanged?.({ reviews: [] });
      }
      return res;
    });
    toggleModal("warning", false);
  };

  const handleUpdateToSelling = () => {
    if (type === "sold") toggleModal("warning", true);
    else updateToSelling();
  };

  const handleReserveConfirm = async (rid: number) => {
    const nextProd = {
      ...product,
      reservation_userId: rid,
      reservation_at: new Date().toISOString(),
    };
    const res = await runWithOptimistic(
      "reserved",
      async () => {
        const r = await updateProductStatus(product.id, "reserved", rid);
        if (r?.success) toast.success("예약 상태로 변경했습니다.");
        return r;
      },
      nextProd
    );
    return !!res?.success;
  };

  const thumbUrl = product.images?.[0]?.url
    ? `${product.images[0].url}/public`
    : null;
  const href = `/products/view/${product.id}`;
  const gameChips = useMemo(() => {
    const chips = [];
    const gt = product.game_type as keyof typeof GAME_TYPE_DISPLAY;
    if (gt && GAME_TYPE_DISPLAY[gt]) chips.push(GAME_TYPE_DISPLAY[gt]);
    return chips;
  }, [product]);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:shadow-md">
      <div className="flex p-4 gap-4">
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

        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start gap-2">
              <Link href={href} className="min-w-0">
                <h3 className="truncate text-base font-semibold text-primary group-hover:text-brand transition-colors">
                  {product.title}
                </h3>
              </Link>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusPill tab={type} />
                {type === "reserved" && (
                  <ReservationUserInfo
                    userId={product.reservation_userId ?? null}
                    fallback={product.reservation_user}
                  />
                )}
                {type === "sold" && purchaseUserInfo.username && (
                  <UserAvatar
                    avatar={purchaseUserInfo.avatar}
                    username={purchaseUserInfo.username}
                    size="sm"
                    compact
                  />
                )}
              </div>
            </div>
            <div className="text-sm font-bold text-brand dark:text-brand-light mt-1">
              {formatToWon(product.price)}원
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex flex-wrap gap-1.5">
              {gameChips.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
              {product.category?.kor_name && (
                <Chip>{product.category.kor_name}</Chip>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border/50">
              <div className="flex gap-3">
                <Metric icon={<HeartIcon className="size-3.5 text-rose-500" />}>
                  {product._count.product_likes ?? 0}
                </Metric>
                <Metric icon={<EyeIcon className="size-3.5" />}>
                  {product.views ?? 0}
                </Metric>
              </div>
              <TimeAgo date={product.created_at?.toString() ?? ""} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="grid grid-flow-col auto-cols-fr border-t border-border divide-x divide-border bg-surface-dim/30">
        {type === "selling" && (
          <button
            onClick={() => toggleModal("reservation", true)}
            disabled={opLoading}
            className="py-3 text-sm font-medium text-brand hover:bg-surface-dim transition-colors disabled:opacity-50"
          >
            예약자 선택
          </button>
        )}
        {type === "reserved" && (
          <>
            <button
              onClick={handleUpdateToSelling}
              disabled={opLoading}
              className="py-3 text-sm font-medium text-muted hover:text-primary hover:bg-surface-dim"
            >
              예약 취소
            </button>
            <button
              onClick={handleUpdateToSold}
              disabled={opLoading}
              className="py-3 text-sm font-medium text-brand hover:bg-brand/5"
            >
              판매 완료
            </button>
          </>
        )}
        {type === "sold" && (
          <>
            <button
              onClick={handleUpdateToSelling}
              disabled={opLoading}
              className="py-3 text-sm font-medium text-muted hover:text-primary hover:bg-surface-dim"
            >
              판매중 변경
            </button>
            {sellerReviews.length > 0 ? (
              <button
                onClick={() => toggleModal("reviewSeller", true)}
                className="py-3 text-sm font-medium text-primary hover:bg-surface-dim"
              >
                내 리뷰 보기
              </button>
            ) : (
              <button
                onClick={() => toggleModal("reviewCreate", true)}
                disabled={reviewLoading}
                className="py-3 text-sm font-medium text-brand hover:bg-brand/5 disabled:opacity-50"
              >
                {reviewLoading ? "처리 중..." : "리뷰 작성"}
              </button>
            )}
            <button
              onClick={() => toggleModal("reviewBuyer", true)}
              className="py-3 text-sm font-medium text-muted hover:text-primary hover:bg-surface-dim"
            >
              구매자 리뷰
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      <CreateReviewModal
        isOpen={modalState.reviewCreate}
        onClose={() => toggleModal("reviewCreate", false)}
        onSubmit={handleSubmitReview}
        username={purchaseUserInfo.username}
        userAvatar={purchaseUserInfo.avatar}
      />
      <ReviewDetailModal
        isOpen={modalState.reviewSeller}
        onClose={() => toggleModal("reviewSeller", false)}
        title="내가 쓴 리뷰"
        review={sellerReviews[0]}
        onDelete={() => toggleModal("deleteConfirm", true)}
      />
      <ReviewDetailModal
        isOpen={modalState.reviewBuyer}
        onClose={() => toggleModal("reviewBuyer", false)}
        title="구매자 리뷰"
        review={buyerReviews[0]}
        emptyMessage="아직 작성된 리뷰가 없습니다."
      />
      <SelectUserModal
        productId={product.id}
        isOpen={modalState.reservation}
        onOpenChange={(v) => toggleModal("reservation", v)}
        onConfirm={handleReserveConfirm}
      />

      <ConfirmDialog
        open={modalState.warning}
        onCancel={() => toggleModal("warning", false)}
        onConfirm={updateToSelling}
        loading={opLoading}
        title="상태 변경 경고"
        confirmLabel="변경"
        description="판매 중으로 변경하면 작성된 리뷰가 모두 삭제됩니다."
      />
      <ConfirmDialog
        open={modalState.deleteConfirm}
        onCancel={() => toggleModal("deleteConfirm", false)}
        onConfirm={confirmDeleteReview}
        loading={isDeleting}
        title="리뷰 삭제"
        confirmLabel="삭제"
        description="삭제 후에는 복구할 수 없습니다."
      />
    </div>
  );
}
