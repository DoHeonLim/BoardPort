/**
 * File Name : features/post/actions/update.ts
 * Description : 게시글 수정 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Created   posts.ts에서 수정 로직 분리
 * 2026.03.05  임도헌   Modified  수정 시 발생하는 불필요한 `revalidateTag` 파편화 코드 제거 및 캐싱 정책 최적화
 * 2026.03.07  임도헌   Modified  태그/사진/위치 payload 파싱 오류를 ActionState 실패로 정규화
 */
"use server";

import getSession from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { updatePost as updatePostService } from "@/features/post/service/post";
import { postFormSchema } from "@/features/post/schemas";
import type { PostActionResponse, PostUpdateDTO } from "@/features/post/types";

/**
 * 게시글 수정 Action
 * - 폼 데이터 검증 후 Service를 호출하여 게시글을 수정
 * - 성공 시 게시글 상세 및 목록 캐시를 무효화
 *
 * @param formData - 게시글 폼 데이터 (id 필수)
 * @returns 처리 결과 (성공 시 postId 포함)
 */
export async function updatePostAction(
  formData: FormData
): Promise<PostActionResponse> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  // 1. FormData 파싱
  const idStr = formData.get("id")?.toString();
  const id = idStr ? Number(idStr) : undefined;

  if (!id) return { success: false, error: "게시글 ID가 누락되었습니다." };

  const tagsString = formData.get("tags")?.toString() || "[]";
  let tags: string[] = [];
  try {
    const parsedTags = JSON.parse(tagsString);
    if (!Array.isArray(parsedTags)) {
      return { success: false, error: "태그 형식이 올바르지 않습니다." };
    }
    tags = parsedTags;
  } catch {
    return { success: false, error: "태그 형식이 올바르지 않습니다." };
  }
  const photos = formData.getAll("photos[]").map(String);
  const locationRaw = formData.get("location")?.toString();
  let locationData = null;
  if (locationRaw) {
    try {
      locationData = JSON.parse(locationRaw);
    } catch {
      return { success: false, error: "위치 정보 형식이 올바르지 않습니다." };
    }
  }

  let fallbackPhotos: string[] = [];
  if (!photos.length) {
    try {
      const parsedPhotos = JSON.parse(formData.get("photos")?.toString() || "[]");
      if (!Array.isArray(parsedPhotos)) {
        return { success: false, error: "이미지 목록 형식이 올바르지 않습니다." };
      }
      fallbackPhotos = parsedPhotos.map(String);
    } catch {
      return { success: false, error: "이미지 목록 형식이 올바르지 않습니다." };
    }
  }

  const rawData = {
    id,
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags,
    photos: photos.length ? photos : fallbackPhotos,
    location: locationData,
  };

  // 2. Zod 검증
  const parsed = postFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "입력값이 올바르지 않습니다." };
  }

  // 3. Service 호출
  const dto: PostUpdateDTO = {
    ...parsed.data,
    id,
    tags: parsed.data.tags || [],
    photos: parsed.data.photos || [],
  };

  const result = await updatePostService(session.id, dto);

  // 4. 결과 처리
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateTag(T.POST_DETAIL(result.data.postId)); // 상세 본문 갱신
  revalidatePath("/posts");

  return { success: true, postId: result.data.postId };
}
