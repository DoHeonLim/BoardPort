/**
 * File Name : lib/zod-helpers.ts
 * Description : Zod 기반 폼 스키마에서 반복되는 문자열/숫자 전처리 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.08  임도헌   Created   빈 문자열/숫자 입력 처리와 공통 required 스키마 유틸 추가
 * 2026.03.12  임도헌   Modified  문자열/숫자 공통 전처리 유틸의 역할과 입력 정규화 규칙 명확화
 */

import { z } from "zod";

/**
 * 공백만 있는 문자열까지 비어 있음으로 처리하는 필수 문자열 스키마
 * - 폼 기본값 `""` 대응
 * - trim 후 최소 길이 검증 연결
 */
export const requiredTrimmedString = (message: string) =>
  z
    .string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message);

/**
 * 선택 입력 문자열을 `null` 허용 필드로 정규화
 * - 빈 문자열, `undefined`, `null`을 `null`로 통일
 * - 추가 문자열 검증 스키마 주입 가능
 */
export const normalizeNullableString = (
  schema: z.ZodString = z.string().trim()
) =>
  schema
    .optional()
    .nullable()
    .transform((value) => (value === "" || value == null ? null : value));

/**
 * 숫자 입력값 전처리
 * - 빈값을 `undefined`로 정규화
 * - 문자열 숫자 trim 후 `Number` 변환
 */
const normalizeNumberInput = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : Number(trimmed);
  }

  return value;
};

/**
 * 입력값 전처리를 포함한 필수 숫자 스키마
 * - `<input>` 빈 문자열의 `0` 변환 방지
 * - 추가 숫자 검증 스키마 주입 가능
 */
export const requiredNumber = (
  message: string,
  schema: z.ZodNumber = z.number({
    required_error: message,
    invalid_type_error: message,
  })
) => z.preprocess(normalizeNumberInput, schema);
