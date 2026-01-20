/**
 * File Name : app/posts/[id]/page
 * Description : 동네생활 게시글 페이지
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
 */

import { notFound } from "next/navigation";
import { getCachedPost, getUser } from "./actions/posts";
import { getCachedLikeStatus } from "./actions/likes";
import { incrementViews } from "@/lib/viewCounter";
import PostDetail from "@/features/post/components/postsDetail";

export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return notFound();

  const user = await getUser();

  /**
   * 상세 데이터/조회수 증가/좋아요 상태를 병렬 처리한다.
   * - getCachedPost: 캐시된 상세 (태그 기반)
   * - incrementViews: 부수효과(조회수) + 3분 쿨다운 (단일 진입점)
   * - getCachedLikeStatus: 좋아요/카운트 캐시
   */
  const [post, didIncrement, likeStatus] = await Promise.all([
    getCachedPost(id),
    incrementViews({
      target: "POST",
      targetId: id,
      viewerId: user?.id ?? null,
    }),
    getCachedLikeStatus(id),
  ]);

  if (!post) return notFound();

  const mergedPost = {
    ...post,
    // didIncrement=true일 때만 화면 표시값을 +1 보정한다. (쿨다운이면 보정 금지)
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
