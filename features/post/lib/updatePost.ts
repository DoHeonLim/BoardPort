/**
 * File Name : features/post/lib/updatePost.ts
 * Description : 게시글 수정 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.04.21  임도헌   Created
 * 2025.04.21  임도헌   Modified  게시글 편집 폼 액션 추가
 * 2025.07.06  임도헌   Modified  게시글 수정 액션 분리 및 리팩토링
 * 2025.11.20  임도헌   Modified   revalidate 태그 네이밍 통일
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 */
"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import { postFormSchema } from "@/features/post/lib/postFormSchema";
import * as T from "@/lib/cacheTags";

export async function updatePost(formData: FormData) {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const tagsString = formData.get("tags")?.toString() || "[]";
  const tags = JSON.parse(tagsString);

  const data = {
    id: formData.get("id"),
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    photos: JSON.parse(JSON.stringify(formData.getAll("photos[]"))),
    tags,
  };

  const results = postFormSchema.safeParse(data);
  if (!results.success) {
    return {
      success: false,
      error: "유효성 검사에 실패했습니다.",
    };
  }

  try {
    // 기존 이미지 삭제
    await db.postImage.deleteMany({
      where: { postId: results.data.id },
    });

    // 기존 태그 연결 해제
    await db.post.update({
      where: { id: results.data.id },
      data: {
        tags: { set: [] },
      },
    });

    // 게시글 업데이트
    const updatedPost = await db.post.update({
      where: { id: results.data.id },
      data: {
        title: results.data.title,
        description: results.data.description,
        category: results.data.category,
        tags: {
          connectOrCreate: results.data.tags?.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
    });

    // 새 이미지 추가
    if (results.data.photos?.length) {
      await Promise.all(
        results.data.photos.map((url, index) =>
          db.postImage.create({
            data: {
              url,
              order: index,
              post: { connect: { id: updatedPost.id } },
            },
          })
        )
      );
    }

    revalidateTag(T.POST_DETAIL(updatedPost.id));

    return { success: true, postId: updatedPost.id };
  } catch (error) {
    console.error("게시글 수정 오류:", error);
    return {
      success: false,
      error: "게시글 수정에 실패했습니다.",
    };
  }
}
