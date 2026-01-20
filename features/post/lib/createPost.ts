/**
 * File Name : features/post/lib/createPost.ts
 * Description : 게시글 생성 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.23  임도헌   Created
 * 2024.11.23  임도헌   Modified  동네생활 게시글 생성 코드 추가
 * 2024.12.10  임도헌   Modified  이미지 여러개 업로드 코드 추가
 * 2025.03.02  임도헌   Modified  게시글 작성시 게시글 추가 관련 뱃지 체크 추가
 * 2025.03.29  임도헌   Modified  checkBoardExplorerBadge 기능 추가
 * 2025.07.04  임도헌   Modified  게시글 생성 액션 분리 및 리팩토링
 * 2025.12.07  임도헌   Modified  게시글 관련 뱃지 체크를 badgeChecks/onPostCreate + RULE_SAGE로 정리
 * 2026.01.03  임도헌   Modified  게시글 생성 후 POST_LIST 태그 및 /posts 경로 무효화로 목록 즉시 최신화
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 */
"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { postFormSchema } from "@/features/post/lib/postFormSchema";
import { badgeChecks, checkRuleSageBadge } from "@/features/user/lib/badges";
import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";

export async function createPost(formData: FormData) {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const data = {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags: JSON.parse(JSON.stringify(formData.getAll("tags[]"))),
    photos: JSON.parse(JSON.stringify(formData.getAll("photos[]"))),
  };

  const results = postFormSchema.safeParse(data);
  if (!results.success) {
    return { success: false, error: "유효성 검사에 실패했습니다." };
  }

  try {
    // 트랜잭션으로 게시글과 관련 데이터를 한번에 생성
    const post = await db.$transaction(async (tx) => {
      // 1. 게시글 생성
      const post = await tx.post.create({
        data: {
          title: results.data.title,
          description: results.data.description,
          category: results.data.category,
          user: { connect: { id: session.id } },
        },
      });

      // 2. 태그 처리
      if (results.data.tags?.length) {
        for (const tagName of results.data.tags) {
          // 태그 생성 또는 업데이트
          const tag = await tx.postTag.upsert({
            where: { name: tagName },
            create: { name: tagName, count: 1 },
            update: { count: { increment: 1 } },
          });
          // 게시글과 태그 연결
          await tx.post.update({
            where: { id: post.id },
            data: { tags: { connect: { id: tag.id } } },
          });
        }
      }

      // 3. 이미지 처리
      if (results.data.photos?.length) {
        await Promise.all(
          results.data.photos.map((url, index) =>
            tx.postImage.create({
              data: {
                url,
                order: index,
                post: { connect: { id: post.id } },
              },
            })
          )
        );
      }
      // 생성된 게시글 반환
      return post;
    });

    // 게시글 생성 후 뱃지 체크 수행
    // - onPostCreate        : FIRST_POST / POPULAR_WRITER 등 "글 기반" 뱃지
    // - onEventParticipation: EARLY_SAILOR 등 이벤트/초기 유입 뱃지
    // - checkRuleSageBadge  : MAP 카테고리 규칙 설명/공략 전용 뱃지
    //
    // BOARD_EXPLORER / PORT_FESTIVAL:
    //   - /api/cron/check-badge (Vercel Cron)에서 주기적으로 점검
    const badgeTasks: Promise<any>[] = [
      badgeChecks.onPostCreate(session.id),
      badgeChecks.onEventParticipation(session.id),
    ];

    if (results.data.category === "MAP") {
      badgeTasks.push(checkRuleSageBadge(session.id));
    }

    // 게시글 생성은 성공시키되, 뱃지 계산 실패는 전체 트랜잭션에 영향 주지 않도록 allSettled 사용
    await Promise.allSettled(badgeTasks);

    // 게시글 생성 성공 후 (return 전에)
    revalidateTag(T.POST_LIST());
    revalidatePath("/posts");

    // 게시글 ID 반환
    return { success: true, postId: post.id };
  } catch (error) {
    console.error("게시글 생성 오류:", error);
    return { success: false, error: "게시글 생성 중 오류가 발생했습니다." };
  }
}
