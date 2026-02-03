/**
 * File Name : features/post/lib/postFormSchema.ts
 * Description : 게시글 수정 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.04.21  임도헌   Created
 * 2025.04.21  임도헌   Modified  게시글 수정 스키마
 * 2025.07.04  임도헌   Modified  게시글 스키마로 통합
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 * 2026.01.22  임도헌   Merged    postFormSchema + commentFormSchema 통합
 * 2026.01.27  임도헌   Modified  주석 보강
 */

import { z } from "zod";
import { POST_CATEGORY } from "@/features/post/constants";

// =============================================================================
// 1. Post Schema (Create / Update)
// =============================================================================

/** 게시글 작성/수정 폼 스키마 */
export const postFormSchema = z.object({
  id: z.coerce.number().optional(),
  title: z
    .string({ required_error: "제목을 적어주세요." })
    .min(5, "5자 이상 적어주세요."),
  description: z.string().min(1, "내용을 입력해주세요."),
  category: z.enum(Object.keys(POST_CATEGORY) as [string, ...string[]], {
    required_error: "카테고리를 선택해주세요.",
  }),
  tags: z
    .array(z.string())
    .max(5, "태그는 최대 5개까지만 입력할 수 있습니다.")
    .optional(),
  photos: z.array(z.string()).optional(),
});

export type PostFormValues = z.infer<typeof postFormSchema>;

// =============================================================================
// 2. Comment Schema
// =============================================================================

/** 댓글 작성 스키마 */
export const commentFormSchema = z.object({
  postId: z.coerce.number(),
  payload: z
    .string({ required_error: "댓글을 입력해주세요." })
    .min(2, "댓글은 최소 2자 이상 입력해주세요."),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;
