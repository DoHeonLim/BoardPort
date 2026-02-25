/**
 * File Name : features/review/schemas.ts
 * Description : 리뷰 생성/수정 Zod 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   Zod 스키마 정의
 */

import { z } from "zod";
import {
  REVIEW_MAX_LENGTH,
  REVIEW_MIN_LENGTH,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from "./constants";

export const createReviewSchema = z.object({
  productId: z.number().int().positive(),
  payload: z
    .string()
    .trim()
    .min(
      REVIEW_MIN_LENGTH,
      `리뷰는 최소 ${REVIEW_MIN_LENGTH}자 이상이어야 합니다.`
    )
    .max(
      REVIEW_MAX_LENGTH,
      `리뷰는 최대 ${REVIEW_MAX_LENGTH}자까지 가능합니다.`
    ),
    rate: z
    .number()
    .min(REVIEW_RATING_MIN)
    .max(REVIEW_RATING_MAX)
    .int({ message: "별점은 정수여야 합니다." }),
  type: z.enum(["buyer", "seller"]),
});

export type CreateReviewDTO = z.infer<typeof createReviewSchema>;