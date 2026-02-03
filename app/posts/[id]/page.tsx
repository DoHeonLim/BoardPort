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
 */

import { notFound, redirect } from "next/navigation";
import { incrementViews } from "@/features/common/service/view";
import PostDetail from "@/features/post/components/postsDetail";
import { getUserInfoById } from "@/features/user/service/profile";
import getSession from "@/lib/session";
import { getCachedPost } from "@/features/post/service/post";
import { getCachedPostLikeStatus } from "@/features/post/service/like";

/**
 * 게시글 상세 페이지
 *
 * [기능]
 * 1. 로그인 여부를 확인합니다. (비로그인 시 로그인 페이지로 리다이렉트)
 * 2. 게시글 정보, 좋아요 상태, 유저 정보를 병렬로 로드합니다.
 * 3. 조회수를 증가시킵니다. (3분 쿨다운 적용)
 * 4. `PostDetail` 컴포넌트를 렌더링합니다.
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

  // 1. 세션 확인
  const session = await getSession();
  const userId = session?.id ?? null;

  if (!userId) {
    // 비로그인 시 로그인 페이지로 리다이렉트 (돌아올 URL 포함)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/posts/${id}`)}`);
  }

  // 2. 병렬 데이터 로딩 (상세조회 + 조회수증가 + 좋아요상태 + 유저정보)
  const [post, didIncrement, likeStatus, user] = await Promise.all([
    getCachedPost(id),
    incrementViews({
      target: "POST",
      targetId: id,
      viewerId: userId,
    }),
    getCachedPostLikeStatus(id, userId),
    getUserInfoById(userId),
  ]);

  // 3. 데이터 검증
  if (!post) return notFound();

  // 로그인된 세션 ID로 유저를 못 찾으면(계정 삭제 등) 비정상 상태 -> 로그인 유도
  if (!user) {
    redirect("/login");
  }

  // 조회수 증가분 반영 (쿨다운이 아니라면 +1)
  const mergedPost = {
    ...post,
    views: (post.views ?? 0) + (didIncrement ? 1 : 0),
  };

  return (
    <PostDetail
      post={mergedPost}
      user={user}
      likeCount={likeStatus.likeCount}
      isLiked={likeStatus.isLiked}
    />
  );
}
