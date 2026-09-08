/**
 * File Name : features/post/actions/update.ts
 * Description : 게시글 수정 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Created   posts.ts에서 수정 로직 분리
 * 2026.03.05  임도헌   Modified  수정 시 발생하는 불필요한 `revalidateTag` 파편화 코드 제거 및 캐싱 정책 최적화
 * 2026.03.07  임도헌   Modified  태그/사진/위치 payload 파싱 오류를 ActionState 실패로 정규화
 * 2026.03.08  임도헌   Modified  Zod 검증 실패를 fieldErrors 형태로 반환해 폼 하단 에러 매핑과 연결
 * 2026.03.12  임도헌   Modified  GIF 조건부 최적화를 위한 photosAnimated 메타 파싱 및 전달 추가
 * 2026.03.30  임도헌   Modified  게시글 동영상 초안 연결용 videoDraftKey/removeVideo payload 파싱 추가
 * 2026.03.30  임도헌   Modified  blocksJson 기반의 가벼운 블록 편집기 payload 파싱 및 전달 추가
 * 2026.03.31  임도헌   Modified  수정 action의 블록/이미지 payload 파싱 단계 주석 보강
 * 2026.04.01  임도헌   Modified  기존 첨부 동영상 유지 수정 케이스를 서버 검증과 맞추는 hasAttachedVideo 보정 추가
 * 2026.04.02  임도헌   Modified  파일 설명과 수정 액션 주석을 현재 서버 액션 톤으로 정리
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 id 파싱 및 관련 경로 갱신 추가
 * 2026.05.16  임도헌   Modified  기존 첨부 동영상 유지 여부 조회를 post service 헬퍼로 이동
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 */
"use server";

import getSession from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  hasOwnedAttachedPostVideo,
  updatePost as updatePostService,
} from "@/features/post/service/post";
import {
  postEditorBlocksSchema,
  postFormSchema,
} from "@/features/post/schemas";
import { parseBoardGameIdsFormValue } from "@/features/boardgame/utils/form";
import type {
  PostActionResponse,
  PostEditorBlock,
  PostUpdateDTO,
} from "@/features/post/types";

/**
 * 게시글 수정 서버 액션
 *
 * [기능]
 * - FormData와 JSON payload를 안전하게 파싱
 * - 기존 첨부 동영상 유지 케이스를 포함해 Zod 검증과 서버 상태를 맞춤
 * - 수정 service 호출 후 상세/목록 캐시를 무효화
 *
 * @param {FormData} formData - 게시글 폼 데이터 (id 필수)
 * @returns {Promise<PostActionResponse>} 처리 결과 (성공 시 postId 포함)
 */
export async function updatePostAction(
  formData: FormData
): Promise<PostActionResponse> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  // 수정 대상 ID 파싱
  const idStr = formData.get("id")?.toString();
  const id = idStr ? Number(idStr) : undefined;

  if (!id) return { success: false, error: "게시글 ID가 누락되었습니다." };

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
    id,
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags,
    photos,
    photosAnimated,
    boardGameIds,
    videoDraftKey: formData.get("videoDraftKey")?.toString() || null,
    removeVideo: formData.get("removeVideo")?.toString() === "true",
    hasAttachedVideo: false,
    blocks,
    location: locationData,
  };

  // 기존 첨부 동영상 유지 보정
  if (
    !rawData.removeVideo &&
    !rawData.videoDraftKey &&
    blocks.some((block) => block.type === "VIDEO")
  ) {
    rawData.hasAttachedVideo = await hasOwnedAttachedPostVideo(id, session.id);
  }

  // 폼 스키마 검증
  const parsed = postFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 수정 DTO 변환 및 서비스 위임
  const dto: PostUpdateDTO = {
    id,
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

  const result = await updatePostService(session.id, dto);

  // 결과 처리 및 상세/목록 갱신
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTag(T.POST_DETAIL(result.data.postId), { expire: 0 }); // 상세 본문 갱신
  revalidatePath("/posts");
  boardGameIds.forEach((boardGameId) => {
    revalidatePath(`/boardgames/${boardGameId}`);
  });

  return { success: true, postId: result.data.postId };
}
