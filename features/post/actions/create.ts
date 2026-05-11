/**
 * File Name : features/post/actions/create.ts
 * Description : 게시글 생성 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   게시글 관련 서버 액션 분리
 * 2025.11.20  임도헌   Modified  조회수 증가 로직 캐시에서 분리, revalidate 태그/경로 정리
 * 2026.01.02  임도헌   Modified  getCachedPost 캐시 wrapper 고정(prefix) + 호출 시점 태그 주입 방식으로 정리
 * 2026.01.03  임도헌   Modified  게시글 삭제 후 POST_DETAIL + POST_LIST 무효화 및 /posts 경로 무효화로 목록 즉시 반영
 * 2026.01.03  임도헌   Modified  getCachedPost 구독 태그에 POST_VIEWS 추가(상세 정합성)
 * 2026.01.04  임도헌   Modified  incrementPostViews wrapper 제거 → page에서 lib/views/incrementViews 직접 호출로 단일 진입점 고정
 * 2026.01.22  임도헌   Modified  Service 연결, 단순 조회 제거
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/posts/[id]/actions/posts.ts (submitPost) -> features/post/actions/posts.ts
 * 2026.02.01  임도헌   Modified  posts.ts에서 생성/수정 로직 분리(create.ts, update.ts)
 * 2026.02.14  임도헌   Modified  location 파싱 후 FormData에 추가
 * 2026.02.26  임도헌   Modified  dto에 parsed.data.location 추가
 * 2026.03.05  임도헌   Modified  게시글 목록 갱신용 레거시 `revalidateTag` 제거 및 `revalidatePath`와 클라이언트 캐시 무효화로 갱신 책임 분리
 * 2026.03.07  임도헌   Modified  태그/사진/위치 payload 파싱 오류를 ActionState 실패로 정규화
 * 2026.03.08  임도헌   Modified  Zod 검증 실패를 fieldErrors 형태로 반환해 폼 하단 에러 매핑과 연결
 * 2026.03.12  임도헌   Modified  GIF 조건부 최적화를 위한 photosAnimated 메타 파싱 및 전달 추가
 * 2026.03.30  임도헌   Modified  게시글 동영상 초안 연결용 videoDraftKey/removeVideo payload 파싱 추가
 * 2026.03.30  임도헌   Modified  blocksJson 기반의 가벼운 블록 편집기 payload 파싱 및 전달 추가
 * 2026.03.31  임도헌   Modified  블록/이미지 payload 파싱 단계 주석 보강
 * 2026.04.02  임도헌   Modified  파일 설명과 생성 액션 주석을 현재 서버 액션 톤으로 정리
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 id 파싱 및 관련 경로 갱신 추가
 */
"use server";

import getSession from "@/lib/session";
import { revalidatePath } from "next/cache";
import { createPost as createPostService } from "@/features/post/service/post";
import {
  postEditorBlocksSchema,
  postFormSchema,
} from "@/features/post/schemas";
import { parseBoardGameIdsFormValue } from "@/features/boardgame/utils/form";
import type {
  PostActionResponse,
  PostCreateDTO,
  PostEditorBlock,
} from "@/features/post/types";

/**
 * 게시글 생성 서버 액션
 *
 * [기능]
 * - FormData와 JSON payload를 안전하게 파싱
 * - Zod 검증 후 게시글 생성 service를 호출
 * - 실패 시 fieldErrors를 반환하고, 성공 시 게시글 목록 경로를 갱신
 *
 * @param {FormData} formData - 게시글 폼 데이터
 * @returns {Promise<PostActionResponse>} 처리 결과 (성공 시 postId 포함)
 */
export async function createPostAction(
  formData: FormData
): Promise<PostActionResponse> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  // 태그 메타 파싱
  const tagsString = formData.get("tags")?.toString() || "[]";
  let tags: string[] = [];
  try {
    const parsedTags = JSON.parse(tagsString);
    if (!Array.isArray(parsedTags)) {
      return {
        success: false,
        fieldErrors: { tags: ["태그 형식이 올바르지 않습니다."] },
      };
    }
    tags = parsedTags;
  } catch {
    return {
      success: false,
      fieldErrors: { tags: ["태그 형식이 올바르지 않습니다."] },
    };
  }
  // 이미지 메타 파싱
  const photos = formData.getAll("photos[]").map(String);
  const photosAnimatedString =
    formData.get("photosAnimated")?.toString() || "[]";
  let photosAnimated: boolean[] = [];
  try {
    const parsedPhotosAnimated = JSON.parse(photosAnimatedString);
    if (!Array.isArray(parsedPhotosAnimated)) {
      return {
        success: false,
        fieldErrors: {
          photos: ["이미지 애니메이션 메타 형식이 올바르지 않습니다."],
        },
      };
    }
    photosAnimated = parsedPhotosAnimated.map(Boolean);
  } catch {
    return {
      success: false,
      fieldErrors: {
        photos: ["이미지 애니메이션 메타 형식이 올바르지 않습니다."],
      },
    };
  }
  // 위치 메타 파싱
  const locationRaw = formData.get("location")?.toString();
  let locationData = null;
  if (locationRaw) {
    try {
      locationData = JSON.parse(locationRaw);
    } catch {
      return {
        success: false,
        fieldErrors: { location: ["위치 정보 형식이 올바르지 않습니다."] },
      };
    }
  }

  // 본문 블록 메타 파싱
  let blocks: PostEditorBlock[] = [];
  const blocksJson = formData.get("blocksJson")?.toString();
  if (blocksJson) {
    try {
      const parsedBlocks = postEditorBlocksSchema.safeParse(
        JSON.parse(blocksJson)
      );
      if (!parsedBlocks.success) {
        const embedError = parsedBlocks.error.issues.find(
          (issue) => issue.path.includes("embedUrl") && issue.message
        );

        return {
          success: false,
          fieldErrors: {
            description: [
              embedError?.message ?? "본문 블록 형식이 올바르지 않습니다.",
            ],
          },
        };
      }

      blocks = parsedBlocks.data;
    } catch {
      return {
        success: false,
        fieldErrors: { description: ["본문 블록 형식이 올바르지 않습니다."] },
      };
    }
  }

  // 연결 보드게임 ID 파싱
  const boardGameIds = parseBoardGameIdsFormValue(formData.get("boardGameIds"));
  if (!boardGameIds) {
    return {
      success: false,
      fieldErrors: {
        boardGameIds: ["보드게임 연결 정보 형식이 올바르지 않습니다."],
      },
    };
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags,
    photos,
    photosAnimated,
    boardGameIds,
    videoDraftKey: formData.get("videoDraftKey")?.toString() || null,
    removeVideo: formData.get("removeVideo")?.toString() === "true",
    blocks,
    location: locationData,
  };

  // 폼 스키마 검증
  const parsed = postFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 생성 DTO 변환 및 서비스 위임
  const dto: PostCreateDTO = {
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    tags: parsed.data.tags || [],
    photos: parsed.data.photos || [],
    photosAnimated: parsed.data.photosAnimated || [],
    boardGameIds: parsed.data.boardGameIds || [],
    videoDraftKey: parsed.data.videoDraftKey ?? null,
    removeVideo: parsed.data.removeVideo ?? false,
    blocks,
    location: parsed.data.location,
  };

  const result = await createPostService(session.id, dto);

  // 결과 처리 및 목록 갱신
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/posts"); // 리스트 페이지 갱신
  boardGameIds.forEach((boardGameId) => {
    revalidatePath(`/boardgames/${boardGameId}`);
  });
  return { success: true, postId: result.data.postId };
}
