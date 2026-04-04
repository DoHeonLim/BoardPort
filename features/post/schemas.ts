/**
 * File Name : features/post/schemas.ts
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
 * 2026.02.14  임도헌   Modified  location(위치) 객체 필드 추가
 * 2026.02.28  임도헌   Modified  category 에러 메시지 한글화 (Invalid enum value UX 개선)
 * 2026.03.08  임도헌   Modified  requiredTrimmedString 공통 유틸 적용으로 제목/내용/댓글 빈값 검증 통일
 * 2026.03.12  임도헌   Modified  이미지 애니메이션 메타 저장용 photosAnimated 필드 추가
 * 2026.03.30  임도헌   Modified  게시글 동영상 초안 연결용 videoDraftKey/removeVideo 필드 추가
 * 2026.03.30  임도헌   Modified  가벼운 블록 편집기 저장용 PostEditorBlock 스키마 추가
 * 2026.03.31  임도헌   Modified  유튜브 전용 EMBED 블록 검증 필드 추가
 * 2026.04.01  임도헌   Modified  수정 폼의 기존 첨부 동영상 유지 케이스를 위한 hasAttachedVideo 검증 필드 추가
 */

import { z } from "zod";
import { POST_CATEGORY } from "@/features/post/constants";
import { parseYouTubeEmbedInput } from "@/features/post/utils/embed";
import { requiredTrimmedString } from "@/lib/zod-helpers";

// =============================================================================
// 1. Post Schema (Create / Update)
// =============================================================================

export const postEditorBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "EMBED"]),
  textContent: z.string().optional(),
  embedProvider: z.string().optional(),
  embedUrl: z.string().optional(),
  embedTitle: z.string().optional(),
  embedThumbnailUrl: z.string().optional(),
}).superRefine((block, ctx) => {
  if (block.type !== "EMBED") return;

  const embedUrl = block.embedUrl?.trim();
  if (!embedUrl) return;

  if (!parseYouTubeEmbedInput(embedUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["embedUrl"],
      message: "유튜브 링크만 임베드할 수 있습니다.",
    });
  }
});

export const postEditorBlocksSchema = z.array(postEditorBlockSchema);

/** 게시글 작성/수정 폼 스키마 */
export const postFormSchema = z.object({
  id: z.coerce.number().optional(),
  title: requiredTrimmedString("제목을 적어주세요.").min(
    5,
    "5자 이상 적어주세요."
  ),
  description: z.string().optional().default(""),
  category: z.enum(Object.keys(POST_CATEGORY) as [string, ...string[]], {
    errorMap: () => ({ message: "카테고리를 선택해주세요." }),
  }),
  tags: z
    .array(z.string())
    .max(5, "태그는 최대 5개까지만 입력할 수 있습니다.")
    .optional(),
  photos: z.array(z.string()).optional(),
  photosAnimated: z.array(z.boolean()).optional().default([]),
  videoDraftKey: z.string().trim().optional().nullable(),
  hasAttachedVideo: z.coerce.boolean().optional().default(false),
  removeVideo: z.coerce.boolean().optional().default(false),
  blocks: postEditorBlocksSchema.optional(),
  // 위치 정보는 선택 사항이며, 수정 시 삭제(null)될 수 있으므로 nullable() 처리 필수
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      locationName: z.string(),
      region1: z.string(),
      region2: z.string(),
      region3: z.string(),
    })
    .optional()
    .nullable(),
}).superRefine((data, ctx) => {
  const hasText = data.description.trim().length > 0;
  const hasPhotos = (data.photos?.length ?? 0) > 0;
  const hasVideo =
    !data.removeVideo && (!!data.videoDraftKey || !!data.hasAttachedVideo);
  // 서버 검증 기준 정합성
  // 빈 IMAGE / VIDEO 블록만 남은 상태는 실제 미디어가 없는 것으로 간주
  const hasMeaningfulBlocks = (data.blocks ?? []).some((block) => {
    if (block.type === "TEXT") return !!block.textContent?.trim();
    if (block.type === "EMBED") return !!parseYouTubeEmbedInput(block.embedUrl);
    return false;
  });

  if (!hasText && !hasPhotos && !hasVideo && !hasMeaningfulBlocks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["description"],
      message: "내용이나 미디어를 추가해주세요.",
    });
  }
});

export type PostFormValues = z.infer<typeof postFormSchema>;

// =============================================================================
// 2. Comment Schema
// =============================================================================

/** 댓글 작성 스키마 */
export const commentFormSchema = z.object({
  postId: z.coerce.number(),
  payload: requiredTrimmedString("댓글을 입력해주세요.").min(
    2,
    "댓글은 최소 2자 이상 입력해주세요."
  ),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;
