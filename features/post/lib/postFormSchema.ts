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
 */

import { z } from "zod";
import { POST_CATEGORY } from "@/lib/constants";

export const postFormSchema = z.object({
  id: z.coerce.number().optional(), // 수정 모드
  title: z
    .string({
      required_error: "제목을 적어주세요.",
    })
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
