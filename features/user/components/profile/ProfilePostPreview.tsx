/**
 * File Name : features/user/components/profile/ProfilePostPreview.tsx
 * Description : 프로필 최근 작성 게시글 미리보기
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   최근 작성글과 전체 목록 진입점 추가
 */

import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import PostCard from "@/features/post/components/postCard";
import type { PostDetail } from "@/features/post/types";

interface ProfilePostPreviewProps {
  posts: PostDetail[];
  username: string;
  isOwner: boolean;
  returnTo: string;
}

/** 프로필에는 최근 글만 노출하고 전체 커서 목록은 별도 화면에서 제공한다. */
export default function ProfilePostPreview({
  posts,
  username,
  isOwner,
  returnTo,
}: ProfilePostPreviewProps) {
  const listHref = `/profile/${encodeURIComponent(username)}/posts?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-primary">
          {isOwner ? "내 작성 게시글" : "작성 게시글"}
        </h2>
        {posts.length > 0 && (
          <Link
            href={listHref}
            prefetch={false}
            className="focus-ring-soft flex items-center rounded-md text-xs text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
          >
            전체 보기
            <ChevronRightIcon className="ml-0.5 size-3" />
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-surface-dim/30 px-4 py-8 text-center">
          <p className="text-sm text-muted">아직 작성한 게시글이 없습니다.</p>
          {isOwner && (
            <Link
              href="/posts/add"
              prefetch={false}
              className="btn-primary mt-4 inline-flex min-h-[40px] items-center justify-center gap-1.5 px-4 text-sm"
            >
              <PlusIcon className="size-4" />
              게시글 작성하기
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {posts.slice(0, 2).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewMode="list"
              returnTo={returnTo}
            />
          ))}
        </div>
      )}
    </section>
  );
}
