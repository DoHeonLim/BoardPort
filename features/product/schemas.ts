/**
 * File Name : features/product/schemas.ts
 * Description : 제품 수정 스키마
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.12  임도헌   Created
 * 2024.11.12  임도헌   Modified  제품 수정 스키마 추가
 * 2024.12.12  임도헌   Modified  제품 스키마 에러 메시지 변경
 * 2024.12.29  임도헌   Modified  보트포트 형식에 맞게 제품 수정 폼 변경
 * 2025.04.18  임도헌   Modified  enum을 전부 영어로 변경
 * 2025.04.28  임도헌   Modified  tags 제약조건 완화
 * 2025.06.15  임도헌   Modified  productFormSchema로 통합
 * 2025.06.15  임도헌   Modified  lib 폴더로 이동
 * 2025.06.18  임도헌   Modified  id를 z.number().optional()로 수정(제품 추가에서 에러 발생해서 optional로 변경)
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.20  임도헌   Moved     lib/productFormSchemas.ts -> features/product/schemas.ts
 * 2026.02.14  임도헌   Modified  location(위치) 객체 필드 추가
 */

import { z } from "zod";

/**
 * 제품 폼(등록/수정) 데이터 검증 스키마
 */
export const productFormSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string({
    required_error: "제목을 입력해주세요.",
  }),
  description: z.string({
    required_error: "설명을 입력해주세요.",
  }),
  price: z.coerce.number({
    required_error: "가격을 입력해주세요.",
  }),
  // 최소 1개 이상의 이미지 필수
  photos: z
    .array(z.string())
    .min(1, { message: "최소 1개 이상의 이미지를 업로드해주세요." }),

  game_type: z.enum(["BOARD_GAME", "TRPG", "CARD_GAME"], {
    required_error: "게임 종류를 선택해주세요.",
  }),
  min_players: z.coerce
    .number({
      required_error: "최소 플레이어 수를 입력해주세요.",
    })
    .min(1, "최소 1명 이상이어야 합니다."),
  max_players: z.coerce.number({
    required_error: "최대 플레이어 수를 입력해주세요.",
  }),
  play_time: z.string({
    required_error: "플레이 시간을 입력해주세요.",
  }),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "USED"], {
    required_error: "제품 상태를 선택해주세요.",
  }),
  completeness: z.enum(["PERFECT", "USED", "REPLACEMENT", "INCOMPLETE"], {
    required_error: "구성품 상태를 선택해주세요.",
  }),
  has_manual: z.boolean({
    required_error: "설명서 포함 여부를 선택해주세요.",
  }),
  categoryId: z.coerce
    .number({
      required_error: "카테고리를 선택해주세요.",
      invalid_type_error: "카테고리를 선택해주세요.",
    })
    .int()
    .positive()
    .or(z.literal("").transform(() => undefined)),
  tags: z
    .array(z.string())
    .max(5, "태그는 최대 5개까지 입력 가능합니다.")
    .default([]),
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
});

export type productFormType = z.infer<typeof productFormSchema>;
