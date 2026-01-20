/**
 * File Name : features/post/lib/deleteComment.ts
 * Description : 게시글 댓글 삭제 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.07.06  임도헌   Created
 * 2025.11.20  임도헌   Modified  revalidate 태그 네이밍 통일
 * 2026.01.03  임도헌   Modified  댓글 삭제 후 POST_COMMENTS + POST_DETAIL + POST_LIST 무효화로 댓글/카운트 즉시 동기화
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 */
"use server";

import db from "@/lib/db";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";

export const deleteComment = async (commentId: number, postId: number) => {
  try {
    await db.comment.delete({
      where: { id: commentId },
    });

    revalidateTag(T.POST_COMMENTS(postId));
    revalidateTag(T.POST_DETAIL(postId));
    revalidateTag(T.POST_LIST());
    return { success: true };
  } catch (e) {
    console.error("댓글 삭제 실패:", e);
    return { success: false, error: "댓글 삭제 중 오류가 발생했습니다." };
  }
};
