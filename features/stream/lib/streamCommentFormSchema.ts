/**
 * File Name : features/stream/lib/streamCommentFormSchema.ts
 * Description : 스트리밍 녹화(VodAsset) 댓글 입력 폼 유효성 검사용 Zod 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Created   스트리밍 댓글 입력 검증 스키마 추가
 * 2025.09.20  임도헌   Modified  VodAsset 스키마 반영(streamId → vodId)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */

import { z } from "zod";

export const streamCommentFormSchema = z.object({
  payload: z.string().min(1, "댓글을 입력해주세요."),
  vodId: z.number(), // 액션에서 Number(formData.get("vodId"))로 변환 후 검증
});

export type StreamCommentFormValues = z.infer<typeof streamCommentFormSchema>;
