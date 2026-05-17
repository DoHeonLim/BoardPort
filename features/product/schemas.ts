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
 * 2026.03.08  임도헌   Modified  requiredTrimmedString, requiredNumber 공통 유틸 적용 및 빈 문자열 입력 검증 보강
 * 2026.03.08  임도헌   Modified  최대 인원은 최소 인원 이상이어야 하는 교차 필드 검증 추가
 * 2026.03.12  임도헌   Modified  이미지 애니메이션 메타 저장용 photosAnimated 필드 추가
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 id 검증 필드 추가
 * 2026.05.16  임도헌   Modified  폼 값 타입명을 PascalCase 기준으로 정리
 */

import { z } from "zod";
import { requiredNumber, requiredTrimmedString } from "@/lib/zod-helpers";

/**
 * 제품 폼(등록/수정) 데이터 검증 스키마
 *
 * [검증 규칙]
 * - 문자열 필드는 공통 Zod 유틸을 통해 빈 문자열 입력을 정규화
 * - 숫자 필드는 빈값을 `undefined`로 처리한 뒤 required/min 검증 적용
 * - `max_players`는 `min_players` 이상이어야 함
 */
export const productFormSchema = z.object({
  id: z.coerce.number().optional(),
  title: requiredTrimmedString("제목을 입력해주세요."),
  description: requiredTrimmedString("설명을 입력해주세요."),
  price: requiredNumber(
    "가격을 입력해주세요.",
    z
      .number({ required_error: "가격을 입력해주세요." })
      .min(0, "가격은 0원 이상이어야 합니다.")
  ),
  // 최소 1개 이상의 이미지 필수
  photos: z
    .array(z.string())
    .min(1, { message: "최소 1개 이상의 이미지를 업로드해주세요." }),
  photosAnimated: z.array(z.boolean()).optional().default([]),

  game_type: z.enum(["BOARD_GAME", "TRPG", "CARD_GAME"], {
    required_error: "게임 종류를 선택해주세요.",
  }),
  min_players: requiredNumber(
    "최소 플레이어 수를 입력해주세요.",
    z
      .number({ required_error: "최소 플레이어 수를 입력해주세요." })
      .min(1, "최소 1명 이상이어야 합니다.")
  ),
  max_players: requiredNumber(
    "최대 플레이어 수를 입력해주세요.",
    z
      .number({ required_error: "최대 플레이어 수를 입력해주세요." })
      .min(1, "최대 인원은 1명 이상이어야 합니다.")
  ),
  play_time: requiredTrimmedString("플레이 시간을 입력해주세요."),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "USED"], {
    required_error: "제품 상태를 선택해주세요.",
  }),
  completeness: z.enum(["PERFECT", "USED", "REPLACEMENT", "INCOMPLETE"], {
    required_error: "구성품 상태를 선택해주세요.",
  }),
  has_manual: z.boolean({
    required_error: "설명서 포함 여부를 선택해주세요.",
  }),
  categoryId: requiredNumber(
    "카테고리를 선택해주세요.",
    z
      .number({ required_error: "카테고리를 선택해주세요." })
      .int()
      .positive("카테고리를 선택해주세요.")
  ),
  boardGameIds: z
    .array(z.number().int().positive())
    .max(5, "보드게임은 최대 5개까지 연결할 수 있습니다.")
    .optional()
    .default([]),
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
}).refine((data) => data.max_players >= data.min_players, {
  message: "최대 인원은 최소 인원 이상이어야 합니다.",
  path: ["max_players"],
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
