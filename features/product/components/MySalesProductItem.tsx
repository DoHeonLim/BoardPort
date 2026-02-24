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
 * 2026.01.24  임도헌   Modified  deleteReviewAction 사용 및 import 경로 수정
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.02.03  임도헌   Modified  판매 중 탭에 끌어올리기 버튼 추가
 * 2026.02.05  임도헌   Modified  끌어올리기 버튼에 횟수 제한(MAX_BUMP_COUNT) UI 적용
 * 2026.02.05  임도헌   Modified  모달 Dynamic Import 적용
 */

"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { formatToWon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  GAME_TYPE_DISPLAY,
  PRODUCT_STATUS_LABEL,
  MAX_BUMP_COUNT,
} from "@/features/product/constants";
import { useReview } from "@/features/review/hooks/useReview";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import ReservationUserInfo from "@/features/user/components/profile/ReservationUserInfo";
import { EyeIcon, HeartIcon } from "@heroicons/react/24/solid";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import { updateProductStatusAction } from "@/features/product/actions/status";
import { deleteReviewAction } from "@/features/review/actions/delete";
import { getUserInfoAction } from "@/features/user/actions/profile";
import { bumpProductAction } from "@/features/product/actions/bump";
import type {
  MySalesListItem,
  ProductStatus,
  GameType,
} from "@/features/product/types";
import type { ProductReview } from "@/features/review/types";

// Dynamic Imports
const CreateReviewModal = dynamic(
  () => import("@/features/user/components/profile/CreateReviewModal"),
  { ssr: false }
);
const ReviewDetailModal = dynamic(
  () => import("@/features/user/components/profile/ReviewDetailModal"),
  { ssr: false }
);
const SelectUserModal = dynamic(
  () => import("@/features/user/components/profile/SelectUserModal"),
  { ssr: false }
);

interface ProductItemProps {
  product: MySalesListItem;
  type?: ProductStatus; // 현재 탭 상태
  userId: number; // 판매자(나) ID
  onOptimisticMove?: (p: {
    from: ProductStatus;
    to: ProductStatus;
    product: MySalesListItem;
    modifiedProduct?: MySalesListItem;
  }) => () => void;
  onMoveFailed?: (p: {
    from: ProductStatus;
    to: ProductStatus;
  }) => Promise<void>;
  onReviewChanged?: (patch: Partial<MySalesListItem>) => void;
}

interface PurchaseUserInfo {
  username: string;
  avatar: string | null;
}

// 상태 뱃지 UI
function StatusPill({ tab }: { tab?: ProductStatus }) {
  if (!tab) return null;
  const styles = {
    selling: "bg-brand text-white",
    reserved: "bg-accent text-accent-foreground",
    sold: "bg-neutral-500 text-white",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold shadow-sm",
        styles[tab]
      )}
    >
      {PRODUCT_STATUS_LABEL[tab]}
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

/**
 * 판매 상품 아이템 컴포넌트
 *
 * [기능]
 * 1. 상품 정보 렌더링 (제목, 가격, 상태, 조회수 등)
 * 2. 현재 상태(탭)에 따른 액션 버튼 제공
 *    - 판매 중: 예약자 선택
 *    - 예약 중: 예약 취소, 판매 완료
 *    - 판매 완료: 판매 중으로 되돌리기, 리뷰 작성/보기
 * 3. Optimistic Update를 위한 상위 콜백 호출
 * 4. 리뷰 작성/삭제 및 각종 모달 연동
 */
export default function MySalesProductItem({
  product,
  type,
  userId,
  onOptimisticMove,
  onMoveFailed,
  onReviewChanged,
}: ProductItemProps) {
  // 모달 상태 관리
  const [modalState, setModalState] = useState({
    reservation: false, // 예약자 선택
    reviewCreate: false, // 리뷰 작성
    reviewSeller: false, // 내 리뷰 보기
    reviewBuyer: false, // 구매자 리뷰 보기
    warning: false, // 상태 변경 경고 (리뷰 삭제 등)
    deleteConfirm: false, // 리뷰 삭제 확인
  });

  const toggleModal = (key: keyof typeof modalState, open: boolean) => {
    setModalState((prev) => ({ ...prev, [key]: open }));
  };

  const [opLoading, setOpLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 구매자 정보 (판매완료 탭에서 표시)
  const [purchaseUserInfo, setPurchaseUserInfo] = useState<PurchaseUserInfo>({
    username: product.purchase_user?.username ?? "",
    avatar: product.purchase_user?.avatar ?? null,
  });

  // 리뷰 상태 관리
  const [reviews, setReviews] = useState<ProductReview[]>(
    product.reviews ?? []
  );

  const sellerReviews = reviews.filter((r) => r.userId === userId);
  const buyerReviews = reviews.filter(
    (r) => r.userId === (product.purchase_userId ?? -1)
  );

  // 리뷰 작성 훅
  const { isLoading: reviewLoading, submitReview } = useReview({
    productId: product.id,
    type: "seller", // 판매자 입장에서 리뷰 작성
    onSuccess: (newReview) => {
      setReviews((prev) => {
        const next = [newReview, ...prev.filter((r) => r.userId !== userId)];
        onReviewChanged?.({ reviews: next }); // 상위 리스트 업데이트
        return next;
      });
      toggleModal("reviewCreate", false);
    },
  });

  // Props 변경 시 리뷰 상태 동기화
  useEffect(() => {
    if (product.reviews && product.reviews !== reviews) {
      setReviews(product.reviews);
    }
  }, [product.reviews, reviews]);

  // 구매자 정보 비동기 로딩 (필요시)
  useEffect(() => {
    const pUser = product.purchase_user;
    if (pUser) {
      setPurchaseUserInfo({ username: pUser.username, avatar: pUser.avatar });
    } else if (product.purchase_userId) {
      let mounted = true;
      getUserInfoAction(product.purchase_userId).then((info) => {
        if (mounted && info) setPurchaseUserInfo(info);
      });
      return () => {
        mounted = false;
      };
    }
  }, [product.purchase_user, product.purchase_userId]);

  // 리뷰 등록
  const handleSubmitReview = async (text: string, rating: number) => {
    const res = await submitReview(text, rating);
    return !!res.ok;
  };

  // 끌어올리기 훅
  const [isBumping, startBump] = useTransition();
  // 끌어올리기 횟수 제한
  const isBumpMaxed = product.bump_count >= MAX_BUMP_COUNT;

  // 끌어올리기
  const handleBump = () => {
    startBump(async () => {
      const res = await bumpProductAction(product.id);
      if (res.success) {
        toast.success("게시글을 끌어올렸습니다!");
        // 서버 액션 성공 즉시 UI 상의 카운트를 +1 하여 시각적 피드백 제공
        onReviewChanged?.({ bump_count: product.bump_count + 1 });
      } else {
        toast.error(res.error ?? "실패했습니다.");
      }
    });
  };

  // 리뷰 삭제
  const confirmDeleteReview = async () => {
    try {
      const reviewId = sellerReviews[0]?.id;
      if (!reviewId) return;

      setIsDeleting(true);
      const res = await deleteReviewAction(reviewId);

      if (res.success) {
        setReviews((prev) => {
          const next = prev.filter((r) => r.id !== reviewId);
          onReviewChanged?.({ reviews: next });
          return next;
        });
        toggleModal("reviewSeller", false);
        toast.success("리뷰를 삭제했습니다.");
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

  // Optimistic Move 실행기
  const runWithOptimistic = useCallback(
    async (
      to: ProductStatus,
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
      // UI 먼저 업데이트
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
        rollback?.(); // 실패 시 롤백
        await onMoveFailed?.({ from: type, to });
        toast.error("상태 변경 실패");
      } finally {
        setOpLoading(false);
      }
    },
    [onOptimisticMove, onMoveFailed, product, type]
  );

  // 예약중 -> 판매완료
  const handleUpdateToSold = () =>
    runWithOptimistic("sold", () =>
      updateProductStatusAction(product.id, "sold")
    );

  // 판매완료/예약중 -> 판매중 (리뷰 삭제 경고 후 실행)
  const updateToSelling = async () => {
    await runWithOptimistic("selling", async () => {
      const res = await updateProductStatusAction(product.id, "selling");
      if (res?.success) {
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

  // 예약자 선택 완료
  const handleReserveConfirm = async (rid: number) => {
    const nextProd = {
      ...product,
      reservation_userId: rid,
      reservation_at: new Date().toISOString(),
    };
    const res = await runWithOptimistic(
      "reserved",
      async () => {
        const r = await updateProductStatusAction(product.id, "reserved", rid);
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
    const gt = product.game_type as GameType;
    if (gt && GAME_TYPE_DISPLAY[gt]) chips.push(GAME_TYPE_DISPLAY[gt]);
    return chips;
  }, [product]);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:shadow-md">
      {/* 1. 상단 정보 영역 */}
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
                <h3 className="truncate text-base font-semibold text-primary group-hover:text-brand transition-colors">
                  {product.title}
                </h3>
              </Link>
              {/* 상태/유저 배지 */}
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

      {/* 2. Actions (상태별 분기) */}
      <div className="grid grid-flow-col auto-cols-fr border-t border-border divide-x divide-border bg-surface-dim/30">
        {type === "selling" && (
          <>
            <button
              onClick={handleBump}
              disabled={isBumping || isBumpMaxed || opLoading}
              className="py-3 text-sm font-medium text-primary hover:bg-surface-dim transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBumping ? (
                <span className="size-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <ArrowUpIcon
                  className={cn(
                    "size-4",
                    isBumpMaxed ? "text-muted" : "text-brand"
                  )}
                />
              )}

              <span className={cn(isBumpMaxed && "text-muted")}>
                {isBumpMaxed ? "UP 마감" : "UP"}
              </span>

              {/* 횟수 표시: (현재/최대) */}
              <span className="text-[10px] font-normal text-muted">
                ({product.bump_count}/{MAX_BUMP_COUNT})
              </span>
            </button>
            <button
              onClick={() => toggleModal("reservation", true)}
              disabled={opLoading}
              className="py-3 text-sm font-medium text-brand hover:bg-surface-dim transition-colors disabled:opacity-50"
            >
              예약자 선택
            </button>
          </>
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

      {/* 1. 리뷰 작성 */}
      {modalState.reviewCreate && (
        <CreateReviewModal
          isOpen={modalState.reviewCreate}
          onClose={() => toggleModal("reviewCreate", false)}
          onSubmit={handleSubmitReview}
          username={purchaseUserInfo.username}
          userAvatar={purchaseUserInfo.avatar}
        />
      )}
      {/* 2. 내 리뷰 상세/삭제 */}
      {modalState.reviewSeller && (
        <ReviewDetailModal
          isOpen={modalState.reviewSeller}
          onClose={() => toggleModal("reviewSeller", false)}
          title="내가 쓴 리뷰"
          review={sellerReviews[0]}
          onDelete={() => toggleModal("deleteConfirm", true)}
        />
      )}

      {/* 3. 구매자 리뷰 조회 */}
      {modalState.reviewBuyer && (
        <ReviewDetailModal
          isOpen={modalState.reviewBuyer}
          onClose={() => toggleModal("reviewBuyer", false)}
          title="구매자 리뷰"
          review={buyerReviews[0]}
          emptyMessage="아직 작성된 리뷰가 없습니다."
        />
      )}

      {/* 4. 유저 예약자 선택 */}
      {modalState.reservation && (
        <SelectUserModal
          productId={product.id}
          isOpen={modalState.reservation}
          onOpenChange={(v) => toggleModal("reservation", v)}
          onConfirm={handleReserveConfirm}
        />
      )}

      {/* 5. 상태 변경 확인 다이얼로그 */}
      <ConfirmDialog
        open={modalState.warning}
        onCancel={() => toggleModal("warning", false)}
        onConfirm={updateToSelling}
        loading={opLoading}
        title="상태 변경 경고"
        confirmLabel="변경"
        description="판매 중으로 변경하면 작성된 리뷰가 모두 삭제됩니다."
      />

      {/* 6. 삭제 확인 다이얼로그 */}
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
