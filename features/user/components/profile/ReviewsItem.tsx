/**
 * File Name : features/user/components/profile/ReviewsItem.tsx
 * Description : 리뷰 리스트 아이템 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.12.06  임도헌   Created
 * 2024.12.06  임도헌   Modified  유저 리뷰 컴포넌트 추가
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.29  임도헌   Modified  리뷰 컴포넌트 스타일 수정
 * 2025.10.05  임도헌   Modified  created_at 표기 + payload/content 호환
 * 2025.10.29  임도헌   Modified  TimeAgo 컴포넌트로 날짜 표기 일원화(자동 갱신/툴팁)
 * 2025.11.13  임도헌   Modified  리뷰 메세지가 긴 경우 메시지를 펼칠 수 있도록 변경
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (border, text color)
 * 2026.01.15  임도헌   Modified   [Rule 5.1] 시맨틱 토큰 및 레이아웃 개선
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.12  임도헌   Modified  리뷰 목록 별점을 채움형 노란 별 기준으로 복원
 * 2026.03.14  임도헌   Modified  모바일에서 리뷰 아이템 높이가 과하게 커 보이지 않도록 아바타/간격/본문 여백을 압축
 * 2026.03.14  임도헌   Modified  리뷰에 표시되는 상품명을 상세 링크로 연결해 거래 맥락 진입성을 보강
 * 2026.03.18  임도헌   Modified  리뷰 상품 링크용 현재 경로도 내부 경로 기준으로 정규화해 nested returnTo 예외를 완화
 * 2026.04.10  임도헌   Modified  profile 타이포 정책에 맞춰 작성자 라벨 weight와 메타 text-xs 스케일을 정리
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import { StarIcon } from "@heroicons/react/24/solid";
import type { ProfileReview } from "@/features/user/types";
import { cn } from "@/lib/utils";

interface IReviewItemProps {
  review: ProfileReview;
  variant?: "preview" | "full";
}

/**
 * 개별 리뷰 아이템
 *
 * [기능]
 * 1. 작성자 정보, 별점, 작성일, 구매한 상품명 표시
 * 2. 리뷰 내용이 길 경우(3줄 초과) '더 보기' 버튼을 노출하여 확장 기능 제공
 * 3. `useRef`와 `scrollHeight`를 비교하여 오버플로우 여부를 자동 감지
 */
export default function ReviewItem({
  review,
  variant = "full",
}: IReviewItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const returnTo = sanitizeCallbackUrl(
    currentQuery ? `${pathname}?${currentQuery}` : pathname
  );
  const text = review.payload ?? "";
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const allowExpand = variant === "full";

  // 텍스트가 변경될 때마다 넘침 체크
  useEffect(() => {
    if (!allowExpand) {
      setOverflowing(false);
      return;
    }

    const el = contentRef.current;
    if (!el) return;
    // 실제 높이가 클라이언트 높이보다 크면 넘치는 것으로 판단
    setOverflowing(el.scrollHeight > el.clientHeight);
  }, [allowExpand, text]);

  return (
    <div
      className={cn(
        "first:pt-0 last:pb-0",
        variant === "preview" ? "py-3.5 sm:py-4" : "py-4 sm:py-5"
      )}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Avatar */}
        <UserAvatar
          avatar={review.user?.avatar}
          username={review.user?.username || "알 수 없음"}
          showUsername={false}
          size="sm"
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Meta Header */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">
                {review.user?.username || "알 수 없음"}
              </span>
              <div
                className="mt-0.5 flex items-center gap-0.5"
                aria-label={`평점 ${review.rate}점`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={cn(
                      "size-3 sm:size-3.5",
                      star <= review.rate
                        ? "text-yellow-400"
                        : "text-neutral-300 dark:text-neutral-700"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="text-xs text-muted">
              <TimeAgo date={review.created_at} />
            </div>
          </div>

          {/* Product Link Context */}
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted sm:mt-2">
            <span className="shrink-0">구매한 상품:</span>
            <Link
              href={`/products/view/${review.product.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="focus-ring-soft max-w-[200px] rounded-md truncate font-medium text-primary underline-offset-2 transition-colors hover:text-brand hover:underline dark:hover:text-brand-light"
            >
              {review.product.title}
            </Link>
          </div>

          {/* Content (Expandable) */}
          <div
            className={cn(
              "relative",
              variant === "preview" ? "mt-2 sm:mt-2.5" : "mt-2.5 sm:mt-3"
            )}
          >
            <p
              ref={contentRef}
              className={cn(
                "text-sm leading-relaxed whitespace-pre-wrap break-words text-primary",
                !expanded &&
                  (variant === "preview" ? "line-clamp-2" : "line-clamp-3")
              )}
            >
              {text || <span className="text-muted italic">내용 없음</span>}
            </p>

            {allowExpand && overflowing && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="focus-ring-soft mt-1 rounded-md text-xs font-medium text-muted underline underline-offset-2 transition-colors hover:text-brand dark:hover:text-brand-light"
              >
                더 보기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
