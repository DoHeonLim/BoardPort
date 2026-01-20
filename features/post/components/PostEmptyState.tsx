/**
 * File Name : features/post/components/PostEmptyState.tsx
 * Description : 게시글 빈 상태 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 비어있을 때 UI 추가
 * 2025.07.04  임도헌   Modified  검색 조건별 안내 메시지 개선
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 디자인 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import { POST_CATEGORY } from "@/lib/constants";
import {
  PlusIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

interface PostEmptyStateProps {
  keyword?: string;
  category?: string;
}

export default function PostEmptyState({
  keyword,
  category,
}: PostEmptyStateProps) {
  let message = "작성된 게시글이 없습니다.";
  let subMessage = "첫 번째 항해일지를 기록해보세요!";

  if (keyword) {
    message = `'${keyword}' 검색 결과가 없습니다.`;
    subMessage = "다른 키워드로 검색해보세요.";
  } else if (category) {
    message = `'${POST_CATEGORY[category as keyof typeof POST_CATEGORY]}'에 게시글이 없습니다.`;
    subMessage = "이 카테고리의 첫 글을 작성해보세요!";
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="p-4 rounded-full bg-surface-dim mb-4">
        <DocumentMagnifyingGlassIcon className="size-10 text-muted/50" />
      </div>

      <p className="text-lg font-bold text-primary">{message}</p>
      <p className="text-sm text-muted mt-1 mb-6">{subMessage}</p>

      <Link
        href="/posts/add"
        className="btn-primary inline-flex items-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        <span>게시글 작성하기</span>
      </Link>
    </div>
  );
}
