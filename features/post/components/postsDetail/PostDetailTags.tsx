/**
 * File Name : features/post/components/postsDetail/PostDetailTags.tsx
 * Description : 게시글 상세 페이지용 태그 목록 (클릭 시 검색 연동)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.26  임도헌   Created   상세 페이지 태그 노출 누락분 추가 및 컴포넌트화
 * 2026.03.14  임도헌   Modified  태그 이모지(🏷️)를 # prefix로 교체해 렌더링 일관성 확보
 * 2026.03.27  임도헌   Modified  제목 근처 배치에 맞춰 고정 하단 여백을 제거하고 흐름형 간격으로 정리
 * 2026.08.28  임도헌   Modified  정적 태그 링크 목록을 서버 컴포넌트로 전환
 * 2026.08.28  임도헌   Modified  태그 목록 컴포넌트 함수 JSDoc 보강
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PostTag } from "@/features/post/types";

interface PostDetailTagsProps {
  tags: PostTag[];
}

/**
 * 게시글 태그를 해당 키워드 검색으로 연결되는 링크 목록으로 표시한다.
 *
 * @param props - 게시글에 연결된 태그 목록
 * @returns 태그 링크 목록 또는 태그가 없을 때 null
 */
export default function PostDetailTags({ tags }: PostDetailTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <Link
          key={index}
          href={`/posts?keyword=${encodeURIComponent(tag.name)}`}
          className={cn(
            "focus-ring-soft inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform",
            "bg-badge text-badge-text",
            "hover:opacity-80 active:scale-95",
            "border border-transparent dark:border-white/10"
          )}
        >
          #{tag.name}
        </Link>
      ))}
    </div>
  );
}
