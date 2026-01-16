/**
 * File Name : components/profile/ReviewsItem
 * Description : 유저 리뷰 컴포넌트 (작성일 표기 + payload/content 호환)
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
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { ProfileReview } from "@/types/profile";
import UserAvatar from "../global/UserAvatar";
import TimeAgo from "../ui/TimeAgo";
import { StarIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface IReviewItemProps {
  review: ProfileReview;
}

export default function ReviewItem({ review }: IReviewItemProps) {
  const text = review.payload ?? "";
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 내부에서만 넘침 체크 (짧은 리뷰는 페이드/버튼 숨김)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // 3줄(약 4.5rem = 72px) 이상이면 더보기 표시
    setOverflowing(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div className="py-5 first:pt-0 last:pb-0 border-b border-border last:border-none">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <UserAvatar
          avatar={review.user?.avatar}
          username={review.user?.username || "알 수 없음"}
          size="md" // 48px
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Meta Header */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-primary">
                {review.user?.username || "알 수 없음"}
              </span>
              <div
                className="flex items-center gap-0.5 mt-0.5"
                aria-label={`평점 ${review.rate}점`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={cn(
                      "size-3.5",
                      star <= review.rate
                        ? "text-yellow-400"
                        : "text-neutral-200 dark:text-neutral-700"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="text-xs text-muted">
              <TimeAgo date={review.created_at} />
            </div>
          </div>

          {/* Product Link Context (Optional improvement) */}
          <div className="mt-2 text-xs text-muted flex items-center gap-1">
            <span className="shrink-0">구매한 상품:</span>
            <span className="font-medium text-primary truncate max-w-[200px]">
              {review.product.title}
            </span>
          </div>

          {/* Content */}
          <div className="mt-3 relative">
            <p
              ref={contentRef}
              className={cn(
                "text-sm text-primary leading-relaxed whitespace-pre-wrap break-words",
                !expanded && "line-clamp-3" // 기본 3줄 제한
              )}
            >
              {text || <span className="text-muted italic">내용 없음</span>}
            </p>

            {overflowing && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs font-medium text-muted hover:text-brand mt-1 underline underline-offset-2"
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
