/**
 * File Name : features/post/actions/create.ts
 * Description : 게시글 생성 Controller
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
 */
"use server";

import getSession from "@/lib/session";
import { revalidatePath } from "next/cache";
import { createPost as createPostService } from "@/features/post/service/post";
import { postFormSchema } from "@/features/post/schemas";
import type { PostActionResponse, PostCreateDTO } from "@/features/post/types";

/**
 * 게시글 생성 Action
 * - 폼 데이터 검증 후 Service를 호출하여 게시글을 생성
 * - 성공 시 게시글 목록 캐시를 무효화
 *
 * @param formData - 게시글 폼 데이터
 * @returns 처리 결과 (성공 시 postId 포함)
 */
export async function createPostAction(
  formData: FormData
): Promise<PostActionResponse> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  // 1. FormData 파싱
  const tagsString = formData.get("tags")?.toString() || "[]";
  let tags: string[] = [];
  try {
    tags = JSON.parse(tagsString);
  } catch {
    tags = [];
  }
  const photos = formData.getAll("photos[]").map(String);
  const locationRaw = formData.get("location")?.toString();
  let locationData = null;
  if (locationRaw) {
    try {
      locationData = JSON.parse(locationRaw);
    } catch {
      console.error("Location parse error");
    }
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags,
    photos: photos.length
      ? photos
      : JSON.parse(formData.get("photos")?.toString() || "[]"),
    location: locationData,
  };

  // 2. Zod 검증
  const parsed = postFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "입력값이 올바르지 않습니다." };
  }

  // 3. Service 호출
  const dto: PostCreateDTO = {
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    tags: parsed.data.tags || [],
    photos: parsed.data.photos || [],
    location: parsed.data.location,
  };

  const result = await createPostService(session.id, dto);

  // 4. 결과 처리
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/posts"); // 리스트 페이지 갱신
  return { success: true, postId: result.data.postId };
}
