/**
 * File Name : features/post/actions/video.ts
 * Description : 게시글 동영상 direct upload 세션 생성 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   게시글 동영상 첨부용 Cloudflare Stream direct upload 액션 추가
 * 2026.03.31  임도헌   Modified  세션 확인과 upload 세션 반환 흐름이 보이도록 JSDoc 보강
 * 2026.03.31  임도헌   Modified  draft 정리와 업로드 실패 상태 반영 액션 추가
 * 2026.04.02  임도헌   Modified  동영상 draft 액션 파라미터/반환 JSDoc 태그 형식 정리
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  createPostVideoUploadSession,
  markPostVideoDraftFailed,
  removePostVideoDraft,
} from "@/features/post/service/video";
import type {
  CreatePostVideoUploadDTO,
  PostVideoUploadActionResponse,
} from "@/features/post/types";

interface PostVideoDraftMutationInput {
  draftKey?: string | null;
  uploadUid?: string | null;
}

/**
 * 게시글 동영상 direct upload 세션 생성 액션
 *
 * [기능]
 * - 로그인 세션을 먼저 확인하고
 * - 게시글 동영상 direct upload 세션 생성을 service 계층에 위임
 * - 클라이언트는 반환된 draftKey와 uploadUrl로 업로드 후 게시글 저장 시 연결
 *
 * @param {CreatePostVideoUploadDTO} input - 선택한 파일 메타
 * @returns {Promise<PostVideoUploadActionResponse>} 업로드 세션 결과
 */
export async function createPostVideoUploadSessionAction(
  input: CreatePostVideoUploadDTO
): Promise<PostVideoUploadActionResponse> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await createPostVideoUploadSession(session.id, input);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data };
}

/**
 * 게시글 동영상 draft 정리 액션
 *
 * [기능]
 * - 로그인 세션을 먼저 확인하고
 * - 게시글에 아직 연결되지 않은 동영상 draft 정리를 service 계층에 위임
 *
 * @param {PostVideoDraftMutationInput} input - draftKey 또는 uploadUid 기준 정리 대상
 * @returns {Promise<{ success: boolean; error?: string }>} 동영상 draft 정리 결과
 */
export async function removePostVideoDraftAction(
  input: PostVideoDraftMutationInput
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await removePostVideoDraft(session.id, input);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

/**
 * 게시글 동영상 업로드 실패 상태 반영 액션
 *
 * [기능]
 * - 로그인 세션을 먼저 확인하고
 * - 업로드 실패한 draft를 FAILED 상태로 반영하는 service를 호출
 *
 * @param {PostVideoDraftMutationInput} input - 실패 상태를 반영할 draft 식별자
 * @returns {Promise<{ success: boolean; error?: string }>} 실패 상태 반영 결과
 */
export async function markPostVideoDraftFailedAction(
  input: PostVideoDraftMutationInput
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await markPostVideoDraftFailed(session.id, input);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (result.data) {
    revalidateTag(T.POST_DETAIL(result.data));
  }

  return { success: true };
}
