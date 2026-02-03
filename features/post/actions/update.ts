/**
 * File Name : features/post/actions/update.ts
 * Description : 게시글 수정 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Created   posts.ts에서 수정 로직 분리
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { updatePost as updatePostService } from "@/features/post/service/post";
import { postFormSchema } from "@/features/post/schemas";
import type { PostActionResponse, PostUpdateDTO } from "@/features/post/types";

/**
 * 게시글 수정 Action
 * - 폼 데이터 검증 후 Service를 호출하여 게시글을 수정합니다.
 * - 성공 시 게시글 상세 및 목록 캐시를 무효화합니다.
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
    tags = JSON.parse(tagsString);
  } catch {
    tags = [];
  }

  const photos = formData.getAll("photos[]").map(String);

  const rawData = {
    id,
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags,
    photos: photos.length
      ? photos
      : JSON.parse(formData.get("photos")?.toString() || "[]"),
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

  revalidateTag(T.POST_DETAIL(result.data.postId));
  revalidateTag(T.POST_LIST());

  return { success: true, postId: result.data.postId };
}
