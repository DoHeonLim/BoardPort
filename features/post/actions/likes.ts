/**
 * File Name : features/post/actions/like.ts
 * Description : 게시글 좋아요 서버 액션
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
 * 2026.04.02  임도헌   Modified  좋아요 액션 반환 설명 JSDoc 보강
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 * 2026.08.27  임도헌   Modified  Service 실패를 예외로 전파해 클라이언트 낙관적 업데이트가 롤백되도록 보강
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { togglePostLike } from "@/features/post/service/like";

/**
 * 게시글 좋아요 추가 Action
 *
 * [기능]
 * - 로그인 세션을 확인하고
 * - 좋아요 추가를 service 계층에 위임
 * - 성공 시 상세 화면 캐시를 무효화해 카운트와 상태를 최신화
 *
 * @param {number} postId - 게시글 ID
 * @returns {Promise<void>} 좋아요 반영 후 상세 캐시 최신화
 * @throws {Error} Service 계층에서 좋아요 처리를 완료하지 못한 경우
 */
export const likePost = async (postId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const result = await togglePostLike(session.id, postId, true);

  // 실패를 정상 완료로 숨기면 클라이언트 mutation의 onError가 실행되지 않아 낙관적 상태가 남는다.
  if (!result.success) throw new Error(result.error);

  revalidateTag(T.POST_DETAIL(postId), { expire: 0 });
};

/**
 * 게시글 좋아요 취소 Action
 *
 * [기능]
 * - 로그인 세션을 확인하고
 * - 좋아요 취소를 service 계층에 위임
 * - 성공 시 상세 화면 캐시를 무효화해 카운트와 상태를 최신화
 *
 * @param {number} postId - 게시글 ID
 * @returns {Promise<void>} 좋아요 취소 반영 후 상세 캐시 최신화
 * @throws {Error} Service 계층에서 좋아요 취소를 완료하지 못한 경우
 */
export const dislikePost = async (postId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const result = await togglePostLike(session.id, postId, false);

  // 좋아요 추가와 같은 실패 계약을 유지해 클라이언트 롤백 경로를 보장한다.
  if (!result.success) throw new Error(result.error);

  revalidateTag(T.POST_DETAIL(postId), { expire: 0 });
};
