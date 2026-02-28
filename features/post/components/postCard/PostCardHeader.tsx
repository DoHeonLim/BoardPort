/**
 * File Name : features/post/components/postCard/PostCardHeader.tsx
 * Description : 게게시글 상단 카테고리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 뱃지 스타일 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 */
"use client";

import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import { cn } from "@/lib/utils";

interface PostCardHeaderProps {
  category: string;
}

/**
 * 게시글의 카테고리를 뱃지 형태로 표시
 * 상수(`POST_CATEGORY`)를 사용하여 카테고리 코드를 사람이 읽을 수 있는 이름으로 변환
 */
export default function PostCardHeader({ category }: PostCardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-0.5">
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-semibold tracking-tight",
          "bg-brand/10 text-brand dark:bg-brand-light/50 dark:text-gray-100"
        )}
      >
        {POST_CATEGORY[category as PostCategoryType] || category}
      </span>
    </div>
  );
}
