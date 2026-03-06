/**
 * File Name : app/posts/[id]/page.tsx
 * Description : 게시글 상세 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  동네생활 게시글 페이지 추가
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
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import getSession from "@/lib/session";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import PostDetail from "@/features/post/components/postsDetail";
import { incrementViews } from "@/features/common/service/view";
import { getUserInfoById } from "@/features/user/service/profile";
import { getCachedPost } from "@/features/post/service/post";
import { getPostLikeStatus } from "@/features/post/service/like";
import { checkBlockRelation } from "@/features/user/service/block";
import { getPostCommentsListAction } from "@/features/post/actions/comments";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = Number(params.id);
  const post = await getCachedPost(id);

  if (!post) {
    return { title: "게시글을 찾을 수 없음" };
  }

  const desc = post.description
    ? post.description.slice(0, 100).replace(/\n/g, " ")
    : "보드포트 항해일지";

  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
    },
  };
}
/**
 * 게시글 상세 페이지
 *
 * [기능]
 * - 로그인 세션 확인 및 비인가 사용자 리다이렉트 처리
 * - 게시글 작성자와 조회자 간의 양방향 차단 관계 검증 (차단 시 403 리다이렉트 처리)
 * - 데이터 조회 전 서버 사이드 조회수 증가 로직(View Increment) 선행 처리
 * - 게시글 상세 정보, 유저 정보, 좋아요 상태의 서버 사이드 병렬 로드 적용
 * - TanStack Query를 활용한 게시글 댓글 목록 서버 프리패치(Prefetch) 적용
 * - HydrationBoundary를 통한 직렬화된 캐시 상태 클라이언트 전달
 *
 * @param {Object} params - URL 파라미터 (id: 게시글 ID)
 */
export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return notFound();

  const session = await getSession();
  const userId = session?.id ?? null;

  // 비로그인 접근 제한 (미들웨어 보조)
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/posts/${id}`)}`);
  }

  // 1. [Write] 조회수 증가 및 무효화 선행
  await incrementViews({
    target: "POST",
    targetId: id,
    viewerId: userId,
  });

  // 2. QueryClient 초기화 및 데이터 병렬 조회
  const queryClient = getQueryClient();
  const [post, likeStatus, viewerInfo] = await Promise.all([
    getCachedPost(id),
    getPostLikeStatus(id, userId),
    getUserInfoById(userId),
    // 서버 환경에서 댓글 첫 페이지를 미리 가져와 캐시에 저장함 (Prefetch)
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.posts.comments(id),
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
        )}&callbackUrl=/posts/${id}`
      );
    }
  }

  return (
    // 3. 직렬화된 캐시 상태(dehydratedState)를 클라이언트로 전송
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostDetail
        post={post}
        user={viewerInfo}
        likeCount={likeStatus.likeCount}
        isLiked={likeStatus.isLiked}
      />
    </HydrationBoundary>
  );
}
