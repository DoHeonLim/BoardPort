/**
 * File Name : features/post/components/postDetail/PostDetailTopbar.tsx
 * Description : 게시글 상세 상단바(뒤로가기 + 카테고리 + 작성자 + 수정 버튼)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.13  임도헌   Created   상세 상단바 분리(레이아웃 의존 제거)
 * 2025.11.13  임도헌   Modified  작성자 정보/수정 버튼 Topbar로 이관
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 스타일 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import Link from "next/link";
import BackButton from "@/components/global/BackButton";
import UserAvatar from "@/components/global/UserAvatar";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import { cn } from "@/lib/utils";

interface Props {
  category?: string | null;
  backHref?: string;
  authorUsername: string;
  authorAvatar?: string | null;
  canEdit?: boolean;
  editHref?: string;
}

/**
 * 게시글 상세 상단바
 * - 좌측: 뒤로가기 버튼 + 작성자 프로필 (Avatar + Name)
 * - 우측: 카테고리 칩 + (작성자인 경우) 수정 버튼
 * - 스크롤 시 상단에 고정(Sticky)됩니다.
 */
export default function PostDetailTopbar({
  category,
  backHref,
  authorUsername,
  authorAvatar,
  canEdit,
  editHref,
}: Props) {
  const safeBack = backHref ?? "/posts";
  const categoryLabel = category && POST_CATEGORY[category as PostCategoryType];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full h-14",
        "bg-surface/80 backdrop-blur-md border-b border-border transition-colors"
      )}
      role="banner"
    >
      <div className="mx-auto w-full max-w-mobile h-full flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton
            fallbackHref={safeBack}
            variant="appbar"
            className="px-0"
          />

          <UserAvatar
            username={authorUsername}
            avatar={authorAvatar ?? null}
            size="sm"
            compact
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Category Chip */}
          {categoryLabel && (
            <Link
              href={`/posts?category=${encodeURIComponent(category!)}`}
              className={cn(
                "hidden sm:inline-flex px-3 py-1 text-xs font-medium rounded-full transition-colors",
                "bg-surface-dim text-muted hover:text-white hover:bg-brand border border-transparent hover:border-brand/20"
              )}
              aria-label={`카테고리 ${categoryLabel}로 보기`}
            >
              {categoryLabel}
            </Link>
          )}

          {/* Edit Button (소유자 전용) */}
          {canEdit && editHref && (
            <Link
              href={editHref}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
                "bg-surface-dim text-muted hover:text-primary hover:bg-border/50"
              )}
            >
              <PencilSquareIcon className="size-4" />
              <span className="text-xs font-medium">수정</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
