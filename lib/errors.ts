/**
 * File Name : lib/errors.ts
 * Description : Prisma 등 런타임 에러 판별 유틸 모음
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.12.22  임도헌   Created    P2002 Unique 에러 가드 유틸 추가
 * 2025.12.23  임도헌   Modified   meta.target 정규화(배열/문자열) 처리 보강
 */

import { Prisma } from "@/generated/prisma/client";

/**
 * Prisma Unique Constraint Error (P2002) 여부를 확인
 * - 중복된 값(닉네임, 이메일 등) 저장 시도 시 발생
 *
 * @param err - catch된 에러 객체
 * @param fields - (선택) 특정 필드에서 발생한 중복인지 확인할 필드명 배열
 * @returns P2002 에러 여부
 */
export function isUniqueConstraintError(
  err: unknown,
  fields?: string[]
): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;

  if (!fields?.length) return true;

  const targetRaw = (err.meta as any)?.target;
  const targets: string[] = Array.isArray(targetRaw)
    ? targetRaw.map(String)
    : typeof targetRaw === "string"
      ? [targetRaw]
      : [];

  if (!targets.length) return false;

  // 지정된 모든 필드가 target 인덱스에 포함되어 있는지 확인
  return fields.every((f) => targets.some((t) => t.includes(f)));
}
