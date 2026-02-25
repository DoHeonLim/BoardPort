/**
 * File Name : features/stream/schemas.ts
 * Description : 스트리밍 도메인 관련 Zod 스키마 통합 (방송 생성/수정, 댓글)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created    app/streams/add/page에서 schema 분리
 * 2025.08.21  임도헌   Modified   tag값 중복 제거 및 최소, 최대 길이 추가
 * 2025.09.16  임도헌   Modified   PRIVATE 비밀번호 길이 제약, 태그 최대 5개, description optional+max
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.23  임도헌   Merged    streamFormSchema + streamCommentFormSchema 통합
 */

import { z } from "zod";
import { STREAM_VISIBILITY } from "@/features/stream/constants";
/**
 * 방송 생성/수정 폼 스키마
 * - 태그 중복 제거 및 최대 5개 제한
 * - PRIVATE 모드일 경우 비밀번호 필수 검증
 */
export const streamFormSchema = z
  .object({
    title: z
      .string({ required_error: "제목을 입력해주세요." })
      .trim()
      .min(5, "5자 이상 적어주세요.")
      .max(60, "제목은 최대 60자입니다."),

    description: z
      .string()
      .trim()
      .max(500, "설명은 최대 500자입니다.")
      .optional()
      .or(z.literal("")),

    thumbnail: z.string().optional(),

    visibility: z
      .enum([
        STREAM_VISIBILITY.PUBLIC,
        STREAM_VISIBILITY.PRIVATE,
        STREAM_VISIBILITY.FOLLOWERS,
      ])
      .default(STREAM_VISIBILITY.PUBLIC),

    password: z.string().optional().or(z.literal("")),

    streamCategoryId: z.coerce
      .number({
        required_error: "카테고리를 선택해주세요.",
        invalid_type_error: "카테고리를 선택해주세요.",
      })
      .int()
      .positive()
      .or(z.literal("").transform(() => undefined)),

    tags: z
      .array(z.string().trim().min(1).max(20))
      .max(5, "태그는 최대 5개까지 가능합니다.")
      .optional()
      .default([])
      .transform((arr) => {
        const seen = new Set<string>();
        const deduped = arr.filter((t) => {
          const k = t.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return deduped.slice(0, 5);
      }),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === STREAM_VISIBILITY.PRIVATE) {
      const pw = (data.password ?? "").trim();
      if (pw.length < 4 || pw.length > 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "비밀번호는 4~32자로 입력해주세요.",
        });
      }
    }
  });

export type StreamFormValues = z.infer<typeof streamFormSchema>;

/**
 * 녹화본(VOD) 댓글 작성 스키마
 */
export const streamCommentFormSchema = z.object({
  payload: z.string().min(1, "댓글을 입력해주세요."),
  vodId: z.number(),
});

export type StreamCommentFormValues = z.infer<typeof streamCommentFormSchema>;
