/**
 * File Name : app/(app)/(tabs)/profile/[username]/posts/page.tsx
 * Description : 사용자 작성 게시글 목록 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   프로필 작성글 커서 목록과 상세 복귀 문맥 추가
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  type InfiniteData,
} from "@tanstack/react-query";
import { DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";
import BackButton from "@/components/global/BackButton";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import PostList from "@/features/post/components/PostList";
import PostListSkeleton from "@/features/post/components/PostListSkeleton";
import { getPostsList } from "@/features/post/service/post";
import type { PostsPage } from "@/features/post/types";
import {
  getUserLocation,
  getUserProfile,
  resolveUserIdByUsername,
} from "@/features/user/service/profile";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: rawUsername } = await props.params;
  const username = decodeURIComponent(rawUsername);

  return {
    title: `${username}님의 작성 게시글`,
    description: `${username}님이 작성한 보드포트 항해일지를 확인하세요.`,
  };
}

/** 기존 게시글 공개·지역·차단 정책을 유지하는 사용자별 작성글 목록 */
export default async function UserPostsPage(props: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const [{ username: rawUsername }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const username = decodeURIComponent(rawUsername);
  const returnTo = sanitizeCallbackUrl(
    searchParams?.returnTo ?? `/profile/${encodeURIComponent(username)}`
  );
  const listHref = `/profile/${encodeURIComponent(username)}/posts?returnTo=${encodeURIComponent(returnTo)}`;

  const session = await getSession();
  if (!session?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(listHref)}`);
  }
  const viewerId = session.id;

  const targetId = await resolveUserIdByUsername(username);
  if (!targetId) return notFound();

  const [profile, viewerLocation] = await Promise.all([
    getUserProfile(targetId, viewerId),
    getUserLocation(viewerId),
  ]);
  if (!profile) return notFound();
  if (profile.isBlocked) {
    redirect(`/profile/${encodeURIComponent(profile.username)}`);
  }

  const params = { authorId: targetId };
  const scope = {
    profileOwnerId: targetId,
    range: viewerLocation?.regionRange ?? "GU",
    region1: viewerLocation?.region1 ?? "",
    region2: viewerLocation?.region2 ?? "",
    region3: viewerLocation?.region3 ?? "",
  };
  const queryKeyParams = { ...params, __scope: scope };
  const queryKey = queryKeys.posts.list(queryKeyParams, viewerId);
  const queryClient = getQueryClient();

  await queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn: () => getPostsList(params, viewerId, null),
    initialPageParam: null as number | null,
  });

  const initialData =
    queryClient.getQueryData<InfiniteData<PostsPage>>(queryKey);
  const isEmpty = initialData?.pages[0]?.posts.length === 0;
  const isOwner = viewerId === targetId;

  return (
    <div className="min-h-screen bg-background pb-24 transition-colors">
      <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-border-subtle bg-background px-3 shadow-sm">
        <BackButton
          fallbackHref={returnTo}
          preferFallback
          variant="appbar"
          className="border-border-subtle bg-surface px-0 shadow-sm backdrop-blur-none"
        />
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-primary">
            {isOwner ? "내 작성 게시글" : `${profile.username}님의 작성 게시글`}
          </h1>
        </div>
      </header>

      <div className="px-page-x py-5 sm:py-6">
        {isEmpty ? (
          <div className="state-screen">
            <div className="state-card">
              <div className="state-icon-wrap">
                <DocumentTextIcon className="size-10 text-muted/50" />
              </div>
              <div>
                <p className="state-title">작성한 게시글이 없습니다.</p>
                <p className="state-description">
                  {isOwner
                    ? "첫 번째 항해일지를 작성해보세요."
                    : "아직 공개된 항해일지가 없습니다."}
                </p>
              </div>
              {isOwner && (
                <div className="state-actions justify-center">
                  <Link
                    href="/posts/add"
                    prefetch={false}
                    className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-6 text-sm"
                  >
                    <PlusIcon className="size-5" />
                    게시글 작성하기
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<PostListSkeleton viewMode="list" />}>
              <PostList
                searchParams={params}
                queryKeyExtra={scope}
                viewerId={viewerId}
              />
            </Suspense>
          </HydrationBoundary>
        )}
      </div>
    </div>
  );
}
