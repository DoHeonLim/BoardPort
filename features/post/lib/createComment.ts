/**
 * File Name : features/post/lib/createComment.ts
 * Description : 게시글 댓글 생성 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.07.06  임도헌   Created
 * 2025.11.20  임도헌   Modified  revalidate 태그 네이밍 통일
 * 2025.12.07  임도헌   Modified  댓글 관련 뱃지 체크 정리(onCommentCreate + 이벤트트)
 * 2026.01.03  임도헌   Modified  댓글 작성 후 POST_COMMENTS + POST_DETAIL + POST_LIST 무효화로 댓글/카운트 즉시 동기화
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 */
"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import { badgeChecks } from "@/features/user/lib/badges";
import { commentFormSchema } from "@/features/post/lib/commentFormSchema";
import * as T from "@/lib/cacheTags";

export const createComment = async (formData: FormData) => {
  const data = {
    payload: formData.get("payload"),
    postId: formData.get("postId"),
  };

  const session = await getSession();
  const result = commentFormSchema.safeParse(data);

  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (!result.success) {
    return { success: false, error: "유효성 검사 실패" };
  }

  try {
    const comment = await db.comment.create({
      data: {
        payload: result.data.payload,
        postId: result.data.postId,
        userId: session.id,
      },
    });

    // 댓글 작성 후 뱃지 체크
    // - onCommentCreate       : 댓글 활동 뱃지(열정적인 통신사 등)
    // - onEventParticipation  : EARLY_SAILOR 등 이벤트/초기유입 뱃지
    //
    // BOARD_EXPLORER / PORT_FESTIVAL:
    //   - /api/cron/check-badge (Vercel Cron) + 게시글/거래/좋아요 액션에서 점검
    await Promise.allSettled([
      badgeChecks.onCommentCreate(session.id),
      badgeChecks.onEventParticipation(session.id),
    ]);

    revalidateTag(T.POST_COMMENTS(result.data.postId));
    revalidateTag(T.POST_DETAIL(result.data.postId));
    revalidateTag(T.POST_LIST());

    return { success: true, id: comment.id };
  } catch (e) {
    console.error("댓글 작성 실패:", e);
    return { success: false, error: "댓글 작성 실패" };
  }
};
