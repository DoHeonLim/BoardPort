/**
 * File Name : app/(app)/posts/[id]/page.tsx
 * Description : 게시글 상세 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  커뮤니티 게시글 페이지 추가
 * 2024.11.05  임도헌   Modified  댓글 기능 추가
 * 2024.11.06  임도헌   Modified  댓글 기능 수정
 * 2024.11.12  임도헌   Modified  프로필 이미지 없을 경우의 코드 추가
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.10  임도헌   Modified  이미지 보기 기능 추가
 * 2024.12.12  임도헌   Modified  뒤로가기 버튼 추가
 * 2024.12.12  임도헌   Modified  게시글 생성 시간 표시 변경
 * 2024.12.18  임도헌   Modified  댓글 작성후 새로고침 방식 변경
 * 2025.03.01  임도헌   Modified  게시글의 좋아요 수, 댓글 수 조회 추가
 * 2025.03.01  임도헌   Modified  좋아요 기능 추가
 * 2025.05.10  임도헌   Modified  UI 변경
 * 2025.07.06  임도헌   Modified  PostDetailWrapper로 분리
 * 2025.11.20  임도헌   Modified  조회수 증가를 캐시랑 분리해서 호출
 * 2026.01.02  임도헌   Modified  상세 캐시(post) + 최신 views 병합(mergedPost) 적용
 * 2026.01.03  임도헌   Modified  좋아요 상태 조회(getCachedLikeStatus)도 병렬 처리로 최적화
 * 2026.01.04  임도헌   Modified  incrementPostViews(didIncrement:boolean) 기반 조회수 표시 보정(+1)으로 통일
 * 2026.01.04  임도헌   Modified  incrementPostViews wrapper 제거 → lib/views/incrementViews 직접 호출로 단일 진입점 고정
 * 2026.01.22  임도헌   Modified  Service 직접 호출 최적화
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.03  임도헌   Modified  순서 보장(Sequencing) 패턴 적용: 조회수 증가 후 데이터 로드
 * 2026.02.04  임도헌   Modified  차단 관계 확인 로직 추가
 * 2026.02.13  임도헌   Modified  generateMetadata 추가
 * 2026.03.03  임도헌   Modified  TanStack Query HydrationBoundary 적용 및 댓글 데이터 Prefetch 로직 추가
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.13  임도헌   Modified  상세 진입 returnTo를 로그인/차단 가드 및 상단 복귀 경로에 반영
 * 2026.03.18  임도헌   Modified  returnTo 미지정 시 게시글 목록(/posts)으로 복귀하도록 기본 경로 고정
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/[id]/page.tsx 에서 app/(app)/posts/[id]/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.14  임도헌   Modified  제품 상세와 동일하게 가드 후 조회수 반영/화면 보정 순서로 조정
 * 2026.05.15  임도헌   Modified  게시글 공유 미리보기용 OG 이미지 메타와 공유 크롤러 접근 분기 추가
 * 2026.06.17  임도헌   Modified  게시글 좋아요 상태 캐시를 조회자 기준으로 분리하도록 viewerId 전달
 * 2026.08.13  임도헌   Modified  게시글 댓글 prefetch cache를 조회자별로 분리
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import getSession from "@/lib/session";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import PostDetail from "@/features/post/components/postsDetail";
import { incrementViews } from "@/features/common/service/view";
import { getUserInfoById } from "@/features/user/service/profile";
import { getCachedPost } from "@/features/post/service/post";
import { getPostLikeStatus } from "@/features/post/service/like";
import { checkBlockRelation } from "@/features/user/service/block";
import { getPostCommentsListAction } from "@/features/post/actions/comments";
import { isSocialCrawlerUserAgent } from "@/lib/socialCrawler";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { title: "게시글을 찾을 수 없음" };
  }
  const post = await getCachedPost(id);

  if (!post) {
    return { title: "게시글을 찾을 수 없음" };
  }

  const desc = post.description
    ? post.description.slice(0, 100).replace(/\s+/g, " ")
    : "보드포트 항해일지";
  const imageUrl = `/posts/${id}/og-image`;

  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      url: `/posts/${id}`,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${post.title} 게시글 미리보기`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: desc,
      images: [imageUrl],
    },
  };
}
/**
 * 게시글 상세 페이지
 *
 * [기능]
 * - 로그인 세션 확인 및 비인가 사용자 리다이렉트 처리
 * - 게시글 작성자와 조회자 간의 양방향 차단 관계 검증 (차단 시 403 리다이렉트 처리)
 * - 게시글 상세 정보, 유저 정보, 좋아요 상태의 서버 사이드 병렬 로드 적용
 * - 가드를 통과한 실제 진입에 한해서만 조회수를 증가시키고 현재 렌더 값에 즉시 반영
 * - TanStack Query를 활용한 게시글 댓글 목록 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달
 * - `returnTo`가 없을 경우 게시글 목록(`/posts`)을 기본 복귀 경로로 사용
 *
 * @param {Object} params - URL 파라미터 (id: 게시글 ID)
 * @param {Object} searchParams - URL 쿼리 파라미터 (returnTo: 복귀 경로)
 */
export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { returnTo?: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return notFound();
  const rawReturnTo = searchParams?.returnTo;
  // 상세 직접 진입 시에도 게시글 목록으로 자연스럽게 복귀하도록 기본 경로 고정
  const returnTo = sanitizeCallbackUrl(rawReturnTo ?? "/posts");
  const detailHref = `/posts/${id}?returnTo=${encodeURIComponent(returnTo)}`;

  const session = await getSession();
  const userId = session?.id ?? null;
  const isSharePreviewCrawler = isSocialCrawlerUserAgent(
    headers().get("user-agent")
  );

  // 공유 미리보기 크롤러는 generateMetadata 수집만 필요하므로 본문 렌더링 생략
  if (!userId && isSharePreviewCrawler) {
    return null;
  }

  // 비로그인 접근 제한 (미들웨어 보조)
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(detailHref)}`);
  }

  // QueryClient 초기화 및 데이터 병렬 조회
  const queryClient = getQueryClient();
  const [post, likeStatus, viewerInfo] = await Promise.all([
    getCachedPost(id),
    getPostLikeStatus(id, userId),
    getUserInfoById(userId),
    // 서버 환경에서 댓글 첫 페이지를 미리 가져와 캐시에 저장함 (Prefetch)
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.posts.comments(id, userId),
      queryFn: () => getPostCommentsListAction(id),
      initialPageParam: undefined as number | undefined,
    }),
  ]);

  if (!post) return notFound();
  if (!viewerInfo) redirect("/login");

  if (userId !== post.user.id) {
    const isBlocked = await checkBlockRelation(userId, post.user.id);
    if (isBlocked) {
      redirect(
        `/403?reason=BLOCKED&username=${encodeURIComponent(
          post.user.username
        )}&callbackUrl=${encodeURIComponent(detailHref)}`
      );
    }
  }

  // 제품 상세와 같은 순서의 가드 통과 확인 후 실제 진입에만 조회수 반영
  const counted = await incrementViews({
    target: "POST",
    targetId: id,
    viewerId: userId,
  });
  const currentViews = counted ? (post.views ?? 0) + 1 : post.views;

  return (
    // 직렬화된 캐시 상태(dehydratedState)를 클라이언트로 전송
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostDetail
        post={post}
        user={viewerInfo}
        views={currentViews}
        likeCount={likeStatus.likeCount}
        isLiked={likeStatus.isLiked}
        viewerId={userId}
        returnTo={returnTo}
        hasExplicitReturnTo={!!rawReturnTo}
      />
    </HydrationBoundary>
  );
}
