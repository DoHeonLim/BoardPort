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
 * 2026.02.26  임도헌   Modified  Grid View 지원, 다크모드 텍스트 가시성(brand-light) 개선, bump_count 방어코드
 * 2026.02.27  임도헌   Modified  본인 리뷰 신고 방지 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  상태 변경/리뷰 삭제 피드백 문구를 구체화(v1.2)
 * 2026.03.12  임도헌   Modified  사용자 업로드 GIF만 썸네일 최적화 예외 처리하도록 이미지 메타 연동
 * 2026.03.12  임도헌   Modified  프로필 판매 카드 구분선을 border-border-subtle 톤으로 통일
 * 2026.03.13  임도헌   Modified  판매 내역에서 제품 상세 진입 시 현재 경로를 returnTo로 함께 전달
 * 2026.03.18  임도헌   Modified  판매 내역 현재 경로도 내부 경로 기준으로 정규화해 nested returnTo 예외를 완화
 * 2026.03.26  임도헌   Modified  판매 완료 카드 액션 밀도와 그리드 리듬 정리
 * 2026.03.26  임도헌   Modified  작은 모바일 폭에서 제목/상태 영역을 재배치해 조기 말줄임을 완화
 * 2026.03.26  임도헌   Modified  메타 태그 가시성을 높이기 위해 대비와 폰트 강도를 보정
 * 2026.04.02  임도헌   Modified  제품 이미지 public variant 처리 유틸 공용화
 * 2026.04.09  임도헌   Modified  판매완료 숨김 상품은 내 판매 카드에서 숨김 배지를 함께 노출
 * 2026.04.09  임도헌   Modified  판매완료 탭 카드에서도 숨기기/숨김 해제를 직접 수행할 수 있도록 액션 추가
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 내 판매 카드의 제목/칩/메타 타이포를 정리
 * 2026.04.17  임도헌   Modified  Lighthouse 대응: 첫 썸네일 우선 로드, 상세 링크 프리패치 비활성화, 카드 제목 heading 정리
 * 2026.04.17  임도헌   Modified  태그와 좋아요/조회수 메타 사이 불필요한 구분선을 제거해 카드 리듬을 단순화
 * 2026.04.19  임도헌   Modified  내 판매 카드 hover 피드백을 그림자 중심으로 정리하고 제목/테두리 과반응을 제거
 * 2026.04.20  임도헌   Modified  썸네일/제목 링크가 기본 outline 대신 공용 포커스 톤을 따르도록 정리
 * 2026.05.03  임도헌   Modified  프로필 판매 카드에 연결 보드게임 배지 표시 추가
 * 2026.05.05  임도헌   Modified  판매 내역 카드 helper와 상태/리뷰 핸들러 JSDoc 보강
 * 2026.05.18  임도헌   Modified  판매 완료 탭의 시간 표기를 등록일이 아닌 판매 완료 시점 기준으로 보정
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
import { usePathname, useSearchParams } from "next/navigation";
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
import { toggleProductHiddenAction } from "@/features/product/actions/visibility";
import { deleteReviewAction } from "@/features/review/actions/delete";
import { getUserInfoAction } from "@/features/user/actions/profile";
import { bumpProductAction } from "@/features/product/actions/bump";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { toProductImagePublicUrl } from "@/features/product/utils/image";
import { removeRecentViewedProduct } from "@/features/product/utils/recentViewed";
import ProductCardBoardGameBadge from "@/features/product/components/productCard/ProductCardBoardGameBadge";
import type {
  MySalesListItem,
  ProductStatus,
  GameType,
  ViewMode,
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
  viewMode?: ViewMode;
  prioritizeImage?: boolean;
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

type ProductStatusActionResult = {
  success: boolean;
  error?: string;
};

/**
 * 판매 탭 상태의 카드 상단 pill 표시
 *
 * @param props - 현재 판매 상태 tab
 * @returns 상태 pill 또는 null
 */
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
        "rounded px-2 py-0.5 text-xs font-bold shadow-sm",
        styles[tab]
      )}
    >
      {PRODUCT_STATUS_LABEL[tab]}
    </span>
  );
}

/**
 * 판매 내역 카드 보조 메타 정보의 작은 칩 표시
 *
 * @param props - 표시할 chip children
 * @returns 메타 chip UI
 */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-border bg-surface-dim px-2.5 py-1 text-xs font-medium leading-none text-primary shadow-sm">
      {children}
    </span>
  );
}

/**
 * 판매 내역 카드 수치 메타의 아이콘 동반 표시
 *
 * @param props - 아이콘과 표시 값
 * @returns metric row UI
 */
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
 * 나의 판매 제품 단일 항목 렌더링 컴포넌트
 *
 * [상호작용 및 상태 제어 로직]
 * - 탭 간 상태 변경(예: 판매 중 -> 판매 완료) 시, 부모로부터 주입받은 `onOptimisticMove` 헬퍼를 호출하여 Query Cache 기반 낙관적 렌더링 수행
 * - 리뷰 작성, 삭제, 끌어올리기 등 단일 아이템 속성 변경 시 `onReviewChanged` 콜백을 통한 캐시 부분 갱신(Patch) 유도
 * - 서버 액션 에러 발생 시 `onMoveFailed`를 호출하여 이전 상태 스냅샷으로 롤백 처리
 */
export default function MySalesProductItem({
  product,
  type,
  userId,
  viewMode = "list",
  prioritizeImage = false,
  onOptimisticMove,
  onMoveFailed,
  onReviewChanged,
}: ProductItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 그리드 상태 변수
  const isGrid = viewMode === "grid";
  const isSoldGrid = isGrid && type === "sold";
  // 모달 상태 관리
  const [modalState, setModalState] = useState({
    reservation: false, // 예약자 선택
    reviewCreate: false, // 리뷰 작성
    reviewSeller: false, // 내 리뷰 보기
    reviewBuyer: false, // 구매자 리뷰 보기
    warning: false, // 상태 변경 경고 (리뷰 삭제 등)
    deleteConfirm: false, // 리뷰 삭제 확인
  });

  /**
   * 판매 내역 카드 내부 모달의 열림 상태 부분 갱신
   *
   * @param key - 제어할 모달 key
   * @param open - 다음 열림 상태
   */
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
  const displayDate =
    type === "sold"
      ? product.purchased_at ?? product.created_at
      : product.created_at;

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

  /**
   * 판매자가 구매자에게 남기는 리뷰 등록
   *
   * @param text - 리뷰 내용
   * @param rating - 별점
   * @returns 등록 성공 여부
   */
  const handleSubmitReview = async (text: string, rating: number) => {
    const res = await submitReview(text, rating);
    return !!res.ok;
  };

  // 끌어올리기 훅
  const [isBumping, startBump] = useTransition();
  // 끌어올리기 횟수 제한
  const isBumpMaxed = product.bump_count >= MAX_BUMP_COUNT;

  /**
   * 판매글 끌어올리기 실행 후 성공 시 로컬 bump count 즉시 반영
   */
  const handleBump = () => {
    startBump(async () => {
      const res = await bumpProductAction(product.id);
      if (res.success) {
        toast.success("게시글을 끌어올렸습니다!");
        // 서버 액션 성공 즉시 UI 상의 카운트를 +1 하여 시각적 피드백 제공
        onReviewChanged?.({ bump_count: product.bump_count + 1 });
      } else {
        toast.error(
          res.error ??
            "게시글 끌어올리기에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      }
    });
  };

  /**
   * 판매자가 작성한 리뷰 삭제 및 목록 상태 동기화
   */
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

  // Optimistic Move 실행기
  const runWithOptimistic = useCallback(
    async (
      to: ProductStatus,
      action: () => Promise<ProductStatusActionResult>,
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
        toast.error(
          "상품 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
      } finally {
        setOpLoading(false);
      }
    },
    [onOptimisticMove, onMoveFailed, product, type]
  );

  /**
   * 예약 중인 상품을 판매 완료 상태로 변경
   */
  const handleUpdateToSold = () =>
    runWithOptimistic("sold", () =>
      updateProductStatusAction(product.id, "sold")
    );

  /**
   * 판매 완료/예약 중 상품의 판매 중 전환과 관련 리뷰 상태 정리
   */
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

  /**
   * 판매 중 전환 전 리뷰 삭제 경고 필요 여부 판단과 다음 액션 분기
   */
  const handleUpdateToSelling = () => {
    if (type === "sold") toggleModal("warning", true);
    else updateToSelling();
  };

  /**
   * 판매 완료 상품의 공개 목록 숨김 상태 토글
   */
  const handleToggleHidden = async () => {
    const nextHidden = !product.hidden_at;

    try {
      setOpLoading(true);
      const result = await toggleProductHiddenAction(product.id, nextHidden);

      if (!result.success) {
        toast.error(
          result.error ??
            "상품 숨김 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      if (nextHidden) {
        removeRecentViewedProduct(product.id);
      }

      onReviewChanged?.({
        hidden_at: nextHidden ? new Date().toISOString() : null,
      });

      toast.success(
        nextHidden
          ? "판매완료 상품을 공개 목록에서 숨겼습니다."
          : "숨김을 해제해 다시 공개 목록에 노출합니다."
      );
    } catch (error) {
      console.error(error);
      toast.error(
        "상품 숨김 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setOpLoading(false);
    }
  };

  /**
   * 선택한 예약자의 상품 연결과 예약 상태 변경
   *
   * @param rid - 예약자 user id
   * @returns 예약 처리 성공 여부
   */
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

  const thumbUrl = toProductImagePublicUrl(product.images?.[0]?.url);
  const currentQuery = searchParams.toString();
  // 상세 재진입 링크도 현재 목록 문맥을 내부 경로 기준으로만 전달
  const returnTo = sanitizeCallbackUrl(
    currentQuery ? `${pathname}?${currentQuery}` : pathname
  );
  const href = `/products/view/${product.id}?returnTo=${encodeURIComponent(returnTo)}`;
  const gameChips = useMemo(() => {
    const chips = [];
    const gt = product.game_type as GameType;
    if (gt && GAME_TYPE_DISPLAY[gt]) chips.push(GAME_TYPE_DISPLAY[gt]);
    return chips;
  }, [product]);

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm transition-shadow hover:shadow-md",
        isGrid ? "h-full" : ""
      )}
    >
      {/* 1. 상단 정보 영역 */}
      <div
        className={cn(
          "flex flex-1",
          isGrid ? "flex-col" : "flex-row gap-3 p-4 sm:gap-4"
        )}
      >
        {/* 썸네일 */}
        <Link
          href={href}
          prefetch={false}
          className={cn(
            "focus-ring-soft relative shrink-0 overflow-hidden bg-surface-dim",
            isGrid
              ? "aspect-[4/3] w-full border-b border-border-subtle"
              : "size-24 sm:size-28 rounded-xl"
          )}
        >
          {thumbUrl ? (
            <Image
              fill
              src={thumbUrl}
              alt={product.title}
              priority={prioritizeImage}
              sizes={isGrid ? "(max-width: 640px) 50vw, 33vw" : "112px"}
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized={!!product.images[0]?.isAnimated}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted text-xs">
              No Image
            </div>
          )}
        </Link>

        {/* 정보 영역 */}
        <div
          className={cn(
            "flex flex-col justify-between min-w-0 flex-1",
            isGrid ? "gap-2 p-3" : ""
          )}
        >
          <div>
            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-2">
              <Link
                href={href}
                prefetch={false}
                className="focus-ring-soft block min-w-0 flex-1 rounded-lg"
              >
                <p
                  className={cn(
                    "font-medium text-primary",
                    isGrid
                      ? "line-clamp-2 text-sm leading-5 sm:text-base sm:leading-6"
                      : "line-clamp-2 text-sm leading-5 sm:line-clamp-1 sm:text-base sm:leading-6"
                  )}
                >
                  {product.title}
                </p>
              </Link>
              {/* 상태/유저 배지 (그리드에서는 배지만 표시) */}
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-start">
                <StatusPill tab={type} />
                {type === "reserved" && !isGrid && (
                  <ReservationUserInfo
                    userId={product.reservation_userId ?? null}
                    fallback={product.reservation_user}
                  />
                )}
                {type === "sold" && purchaseUserInfo.username && !isGrid && (
                  <UserAvatar
                    avatar={purchaseUserInfo.avatar}
                    username={purchaseUserInfo.username}
                    size="sm"
                    compact
                  />
                )}
                {type === "sold" && product.hidden_at && (
                  <span className="rounded border border-border bg-surface-dim px-2 py-0.5 text-xs font-medium text-muted shadow-sm">
                    숨김
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1 text-sm font-bold text-brand dark:text-brand-light sm:text-base">
              {formatToWon(product.price)}원
            </div>
            <ProductCardBoardGameBadge
              items={product.board_games}
              viewMode={isGrid ? "grid" : "list"}
            />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            {!isGrid && (
              <div className="flex flex-wrap gap-1.5">
                {gameChips.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
                {product.category?.kor_name && (
                  <Chip>{product.category.kor_name}</Chip>
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-0.5 text-xs text-muted">
              <div className="flex gap-3">
                <Metric icon={<HeartIcon className="size-3.5 text-rose-500" />}>
                  {product._count.product_likes ?? 0}
                </Metric>
                <Metric icon={<EyeIcon className="size-3.5" />}>
                  {product.views ?? 0}
                </Metric>
              </div>
              <TimeAgo date={displayDate?.toString() ?? ""} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 액션 영역 */}
      <div
        className={cn(
          "border-t border-border-subtle bg-surface-dim/30 shrink-0",
          isSoldGrid
            ? "grid grid-cols-2"
            : isGrid
            ? "flex flex-col divide-y divide-border-subtle"
            : "grid grid-flow-col auto-cols-fr divide-x divide-border-subtle"
        )}
      >
        {type === "selling" && (
          <>
            <button
              onClick={handleBump}
              disabled={isBumping || isBumpMaxed || opLoading}
              className={cn(
                "focus-ring-strong-inset font-medium hover:bg-surface-dim transition-colors flex items-center justify-center gap-1.5 text-primary disabled:opacity-50 disabled:cursor-not-allowed",
                isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
              )}
            >
              {isBumping ? (
                <span className="size-3 border-2 border-brand/30 border-t-brand dark:border-brand-light/30 dark:border-t-brand-light rounded-full animate-spin" />
              ) : (
                <ArrowUpIcon
                  className={cn(
                    "size-4",
                    isBumpMaxed
                      ? "text-muted"
                      : "text-brand dark:text-brand-light"
                  )}
                />
              )}
              <span
                className={cn(
                  isBumpMaxed
                    ? "text-muted"
                    : "text-brand dark:text-brand-light"
                )}
              >
                {isBumpMaxed ? "UP 마감" : "UP"}
              </span>
              <span className="text-xs font-normal text-muted">
                ({product.bump_count ?? 0}/{MAX_BUMP_COUNT})
              </span>
            </button>
            <button
              onClick={() => toggleModal("reservation", true)}
              disabled={opLoading}
              className={cn(
                "focus-ring-strong-inset font-medium text-brand dark:text-brand-light hover:bg-brand/5 dark:hover:bg-brand-light/10 transition-colors disabled:opacity-50",
                isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
              )}
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
              className={cn(
                "focus-ring-strong-inset font-medium text-muted hover:text-primary hover:bg-surface-dim transition-colors",
                isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
              )}
            >
              예약 취소
            </button>
            <button
              onClick={handleUpdateToSold}
              disabled={opLoading}
              className={cn(
                "focus-ring-strong-inset font-medium text-brand dark:text-brand-light hover:bg-brand/5 dark:hover:bg-brand-light/10 transition-colors",
                isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
              )}
            >
              판매 완료
            </button>
          </>
        )}
        {type === "sold" && (
          <>
            {sellerReviews.length > 0 ? (
              <button
                onClick={() => toggleModal("reviewSeller", true)}
                className={cn(
                  "focus-ring-strong-inset font-medium text-primary hover:bg-surface-dim transition-colors",
                  isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
                )}
              >
                내 리뷰 보기
              </button>
            ) : (
              <button
                onClick={() => toggleModal("reviewCreate", true)}
                disabled={reviewLoading}
                className={cn(
                  "focus-ring-strong-inset font-medium text-brand dark:text-brand-light hover:bg-brand/5 dark:hover:bg-brand-light/10 transition-colors disabled:opacity-50",
                  isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
                )}
              >
                {reviewLoading ? "처리 중..." : "리뷰 작성"}
              </button>
            )}
            <button
              onClick={handleUpdateToSelling}
              disabled={opLoading}
              className={cn(
                "focus-ring-strong-inset font-medium text-muted hover:text-primary hover:bg-surface-dim transition-colors",
                isSoldGrid
                  ? "border-r border-border-subtle py-2.5 text-xs"
                  : isGrid
                    ? "py-2.5 text-xs"
                    : "py-3 text-xs sm:text-sm"
              )}
            >
              {isGrid ? "판매 중으로" : "판매 중으로 변경"}
            </button>
            <button
              onClick={() => toggleModal("reviewBuyer", true)}
              className={cn(
                "focus-ring-strong-inset font-medium text-muted hover:text-primary hover:bg-surface-dim transition-colors",
                isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
              )}
            >
              구매자 리뷰
            </button>
            <button
              onClick={handleToggleHidden}
              disabled={opLoading}
              className={cn(
                "focus-ring-strong-inset font-medium text-muted hover:text-primary hover:bg-surface-dim transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isGrid ? "py-2.5 text-xs" : "py-3 text-xs sm:text-sm"
              )}
            >
              {product.hidden_at ? "숨김 해제" : "숨기기"}
            </button>
          </>
        )}
      </div>

      {/* 모달 영역 */}

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
          isOwnReview={true}
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
