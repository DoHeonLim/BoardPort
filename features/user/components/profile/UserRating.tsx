/**
 * File Name : features/user/components/profile/UserRating.tsx
 * Description : 유저 평점 컴포넌트 (부분 별 렌더링 지원)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.06  임도헌   Created
 * 2024.12.06  임도헌   Modified  유저 평점 컴포넌트 추가
 * 2024.12.07  임도헌   Modified  평점 및 갯수 조건 추가
 * 2024.12.12  임도헌   Modified  리뷰가 없을 경우 0으로 나오게 수정
 * 2025.10.29  임도헌   Modified  부분 별(소수점) 렌더링 도입, 0~5 클램프, 텍스트 1자리 고정, a11y 강화
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 */
"use client";

import { StarIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface UserRatingProps {
  average?: number;
  totalReviews?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function UserRating({
  average = 0,
  totalReviews = 0,
  size = "md",
  className,
}: UserRatingProps) {
  // 안전 가드 + 소수점 1자리 표시
  const avg = Math.min(5, Math.max(0, Number(average)));
  const displayAvg = avg.toFixed(1);

  const starSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // i번째 별의 채움 비율
  const fillFor = (i: number) => {
    const v = avg - i;
    if (v >= 1) return 100;
    if (v <= 0) return 0;
    return Math.round(v * 100);
  };

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="img"
      aria-label={`평점 ${displayAvg}점, 후기 ${totalReviews}개`}
    >
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => {
          const pct = fillFor(i);
          return (
            <div
              key={i}
              className={cn("relative inline-block", starSizes[size])}
              aria-hidden="true"
            >
              {/* 바탕(빈 별) */}
              <StarIcon
                className={cn("absolute inset-0 text-border", starSizes[size])}
              />
              {/* 채움(노란 별) - 가로 클리핑 */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${pct}%` }}
              >
                <StarIcon className={cn("text-yellow-400", starSizes[size])} />
              </div>
            </div>
          );
        })}
      </div>
      {/* 평점 갯수 */}
      <span className={cn("font-medium text-muted", textSizes[size])}>
        {displayAvg} <span className="text-muted/60">({totalReviews})</span>
      </span>
    </div>
  );
}
