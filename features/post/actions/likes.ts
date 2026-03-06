/**
 * File Name : features/post/actions/like.ts
 * Description : 게시글 좋아요 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   좋아요 관련 서버 액션 분리
 * 2025.11.20  임도헌   Modified  revalidate 태그 네이밍 통일
 * 2026.01.03  임도헌   Modified  좋아요/취소 후 POST_LIKE_STATUS 외 POST_DETAIL/POST_LIST도 무효화하여 카운트 즉시 동기화
 * 2026.01.22  임도헌   Modified  Service 연결
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/posts/[id]/actions/likes.ts -> features/post/actions/like.ts
 * 2026.03.05  임도헌   Modified  `revalidateTag` 호출 제거 및 `queryClient.setQueryData`를 활용한 좋아요 상태 즉각적 UI 갱신(Optimistic Update) 적용
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { togglePostLike } from "@/features/post/service/like";

/**
 * 게시글 좋아요 추가 Action
 * - 로그인 확인 후 Service를 호출
 * - 성공 시 좋아요 상태, 게시글 상세, 목록 캐시를 무효화하여 UI를 갱신
 *
 * @param {number} postId - 게시글 ID
 */
export const likePost = async (postId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const result = await togglePostLike(session.id, postId, true);

  if (result.success) {
    revalidateTag(T.POST_DETAIL(postId));
  }
};

/**
 * 게시글 좋아요 취소 Action
 * - 로그인 확인 후 Service를 호출
 * - 성공 시 관련 캐시를 무효화
 *
 * @param {number} postId - 게시글 ID
 */
export const dislikePost = async (postId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const result = await togglePostLike(session.id, postId, false);

  if (result.success) {
    revalidateTag(T.POST_DETAIL(postId));
  }
};
