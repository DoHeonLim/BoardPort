/**
 * File Name : features/post/components/postsDetail/PostDetailTags.tsx
 * Description : 게시글 상세 페이지용 태그 목록 (클릭 시 검색 연동)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.26  임도헌   Created   상세 페이지 태그 노출 누락분 추가 및 컴포넌트화
 */
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PostTag } from "@/features/post/types";

interface PostDetailTagsProps {
  tags: PostTag[];
}

export default function PostDetailTags({ tags }: PostDetailTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {tags.map((tag, index) => (
        <Link
          key={index}
          href={`/posts?keyword=${encodeURIComponent(tag.name)}`}
          className={cn(
            "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            "bg-badge text-badge-text",
            "hover:opacity-80 active:scale-95",
            "border border-transparent dark:border-white/10"
          )}
        >
          🏷️ {tag.name}
        </Link>
      ))}
    </div>
  );
}
