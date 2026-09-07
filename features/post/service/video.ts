/**
 * File Name : features/post/service/video.ts
 * Description : 게시글 동영상 첨부 direct upload 및 초안 자산 관리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   게시글 동영상 direct upload 세션 생성 및 초안 정책 유틸 추가
 * 2026.03.31  임도헌   Modified  draft 정리와 업로드 실패 상태 반영 서비스 추가
 * 2026.04.02  임도헌   Modified  동영상 서비스와 정책 상수 배치를 정리하고 JSDoc 태그 형식을 보강
 * 2026.08.26  임도헌   Modified  moderation outbox용 외부 동영상 삭제 실패 전파 옵션 추가
 */
import "server-only";

import crypto from "node:crypto";
import db from "@/lib/db";
import { validateUserStatus } from "@/features/user/service/admin";
import {
  POST_VIDEO_ALLOWED_MIME_TYPES,
  POST_VIDEO_MAX_DURATION_SEC,
  POST_VIDEO_MAX_SIZE_BYTES,
} from "@/features/post/constants";
import type {
  CreatePostVideoUploadDTO,
  PostVideoUploadSession,
} from "@/features/post/types";
import type { ServiceResult } from "@/lib/types";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API_BASE = "https://api.cloudflare.com/client/v4";

interface PostVideoDraftLookup {
  draftKey?: string | null;
  uploadUid?: string | null;
}

/**
 * Cloudflare Stream 비디오 자산 삭제
 *
 * [기능]
 * - 게시글 삭제 또는 draft 정리 시 남은 Stream 자산을 best-effort로 정리
 * - 기본 호출은 외부 API 실패를 경고로 남기고, outbox 호출은 실패를 전파해 재시도
 *
 * @param {string} uid - 삭제할 Cloudflare Stream 자산 UID
 * @param options - `throwOnFailure`가 true면 외부 삭제 실패를 호출자에게 전달
 * @returns {Promise<void>} 외부 자산 정리 시도만 수행
 */
export async function deleteCloudflareStreamAsset(
  uid: string,
  options: { throwOnFailure?: boolean } = {}
) {
  if (!CF_ACCOUNT_ID || !CF_TOKEN) {
    if (options.throwOnFailure) {
      throw new Error("Cloudflare Stream 삭제 환경변수가 누락되었습니다.");
    }
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/accounts/${CF_ACCOUNT_ID}/stream/${uid}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
        },
        cache: "no-store",
      }
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(
        `Cloudflare Stream delete failed status=${response.status}`
      );
    }
  } catch (error) {
    console.warn("[deleteCloudflareStreamAsset] cleanup failed:", error);
    if (options.throwOnFailure) throw error;
  }
}

/**
 * 게시글 첨부용 비디오 업로드 입력을 1차 정책 기준으로 검증
 *
 * [정책]
 * - 커뮤니티 게시글 보조 첨부 성격이므로 대용량/장시간 업로드는 허용하지 않음
 * - direct upload 재시도로 충분한 범위 내에서 파일 크기와 MIME 타입을 제한
 *
 * @param {CreatePostVideoUploadDTO} input - 업로드 세션 생성 전 점검할 파일 메타
 * @returns {{ valid: boolean; error?: string }} 검증 결과
 */
export function validatePostVideoUploadInput(input: CreatePostVideoUploadDTO): {
  valid: boolean;
  error?: string;
} {
  if (!input.filename.trim()) {
    return { valid: false, error: "파일 이름이 비어 있습니다." };
  }

  if (!POST_VIDEO_ALLOWED_MIME_TYPES.includes(input.contentType as never)) {
    return {
      valid: false,
      error:
        "지원하지 않는 비디오 형식입니다. mp4, mov, webm 형식만 업로드할 수 있습니다.",
    };
  }

  if (input.size <= 0) {
    return { valid: false, error: "비디오 파일 크기가 올바르지 않습니다." };
  }

  if (input.size > POST_VIDEO_MAX_SIZE_BYTES) {
    return {
      valid: false,
      error:
        "비디오 용량이 너무 큽니다. 80MB 이하 파일만 업로드할 수 있습니다.",
    };
  }

  return { valid: true };
}

/**
 * 게시글 동영상 direct upload 세션을 생성
 *
 * [동작]
 * - 파일 메타를 1차 정책으로 검증
 * - Cloudflare Stream direct upload 세션 생성
 * - 게시글 생성 전에도 업로드를 시작할 수 있도록 `draftKey` 기반 초안 레코드 저장
 * - webhook에서는 `providerAssetId` 또는 `draftKey`를 기준으로 READY 상태를 반영
 *
 * @param {number} userId - 업로드 요청 사용자 ID
 * @param {CreatePostVideoUploadDTO} input - 업로드할 파일 메타
 * @returns {Promise<ServiceResult<PostVideoUploadSession>>} 업로드 세션 결과
 */
export async function createPostVideoUploadSession(
  userId: number,
  input: CreatePostVideoUploadDTO
): Promise<ServiceResult<PostVideoUploadSession>> {
  const status = await validateUserStatus(userId);
  if (!status.success) return status;

  const validation = validatePostVideoUploadInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error ?? "비디오 업로드 입력값이 올바르지 않습니다.",
    };
  }

  if (!CF_ACCOUNT_ID || !CF_TOKEN) {
    return {
      success: false,
      error: "Cloudflare Stream 환경변수가 설정되지 않았습니다.",
    };
  }

  const draftKey = crypto.randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      `${API_BASE}/accounts/${CF_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          maxDurationSeconds: POST_VIDEO_MAX_DURATION_SEC,
          meta: {
            sourceType: "POST_VIDEO",
            draftKey,
            userId: String(userId),
            name: input.filename,
          },
        }),
      }
    );

    const json = (await response.json().catch(() => ({}))) as {
      result?: {
        uploadURL?: unknown;
        uid?: unknown;
      };
    };
    const uploadURL = json?.result?.uploadURL;
    const uid = json?.result?.uid;

    if (
      !response.ok ||
      typeof uploadURL !== "string" ||
      typeof uid !== "string"
    ) {
      return {
        success: false,
        error: "게시글 동영상 업로드 세션을 만들지 못했습니다.",
      };
    }

    await db.postVideo.create({
      data: {
        userId,
        draftKey,
        uploadUid: uid,
        providerAssetId: uid,
        status: "UPLOADING",
      },
    });

    return {
      success: true,
      data: {
        uploadUrl: uploadURL,
        uploadUid: uid,
        draftKey,
      },
    };
  } catch (error) {
    console.error("[createPostVideoUploadSession] Error:", error);
    return {
      success: false,
      error: "동영상 업로드 세션 생성 중 오류가 발생했습니다.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 게시글에 아직 연결되지 않은 동영상 draft를 정리
 *
 * [기능]
 * - 작성 화면에서 동영상 블록을 제거한 경우를 위한 정리 진입점
 * - 게시글에 연결되지 않은 초안만 삭제하고, 가능하면 Cloudflare 자산도 함께 정리
 */
export async function removePostVideoDraft(
  userId: number,
  lookup: PostVideoDraftLookup
): Promise<ServiceResult<boolean>> {
  const clauses = [
    ...(lookup.draftKey ? [{ draftKey: lookup.draftKey }] : []),
    ...(lookup.uploadUid
      ? [{ uploadUid: lookup.uploadUid }, { providerAssetId: lookup.uploadUid }]
      : []),
  ];

  if (!clauses.length) {
    return { success: true, data: true };
  }

  const draft = await db.postVideo.findFirst({
    where: {
      userId,
      postId: null,
      OR: clauses,
    },
    select: {
      id: true,
      uploadUid: true,
      providerAssetId: true,
    },
  });

  if (!draft) {
    return { success: true, data: true };
  }

  await db.postVideo.delete({ where: { id: draft.id } });
  const assetUid = draft.providerAssetId ?? draft.uploadUid;
  if (assetUid) {
    await deleteCloudflareStreamAsset(assetUid);
  }

  return { success: true, data: true };
}

/**
 * 업로드 실패한 게시글 동영상 draft를 FAILED 상태로 반영
 *
 * [기능]
 * - 업로드 세션은 생성됐지만 전송이 실패한 경우를 위한 보정 진입점
 * - 게시글에 이미 연결된 자산이면 상세에서 실패 상태를 노출할 수 있도록 상태만 갱신
 */
export async function markPostVideoDraftFailed(
  userId: number,
  lookup: PostVideoDraftLookup
): Promise<ServiceResult<number | null>> {
  const clauses = [
    ...(lookup.draftKey ? [{ draftKey: lookup.draftKey }] : []),
    ...(lookup.uploadUid
      ? [{ uploadUid: lookup.uploadUid }, { providerAssetId: lookup.uploadUid }]
      : []),
  ];

  if (!clauses.length) {
    return { success: true, data: null };
  }

  const draft = await db.postVideo.findFirst({
    where: {
      userId,
      OR: clauses,
    },
    select: { id: true, postId: true },
  });

  if (!draft) {
    return { success: true, data: null };
  }

  await db.postVideo.update({
    where: { id: draft.id },
    data: { status: "FAILED" },
  });

  return { success: true, data: draft.postId ?? null };
}
