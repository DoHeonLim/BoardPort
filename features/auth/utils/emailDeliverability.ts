/**
 * File Name : features/auth/utils/emailDeliverability.ts
 * Description : 이메일 발송 전 도메인 차단 및 MX 검사 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   인증/비밀번호 재설정 메일 발송 전 테스트 도메인 차단 및 MX 검사 유틸 추가
 */

import "server-only";

import { resolveMx } from "node:dns/promises";

const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "localhost",
]);

const BLOCKED_EMAIL_SUFFIXES = [".test", ".invalid", ".local"];

/**
 * 메일 발송 가능 이메일 주소 검증
 *
 * 1. 명백한 테스트/예약 도메인 차단
 * 2. MX 레코드 존재 여부 확인
 *
 * @param {string} email - 발송 대상 이메일 주소
 * @returns {Promise<string | null>} 유효하면 null, 차단/실패 시 사용자 메시지
 */
export async function validateDeliverableEmail(
  email: string
): Promise<string | null> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) {
    return "메일 수신이 가능한 이메일 주소를 입력해주세요.";
  }

  if (
    BLOCKED_EMAIL_DOMAINS.has(domain) ||
    BLOCKED_EMAIL_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  ) {
    return "메일 수신이 가능한 이메일 주소를 입력해주세요.";
  }

  try {
    const records = await resolveMx(domain);
    if (!records.length) {
      return "메일 수신이 가능한 이메일 주소를 입력해주세요.";
    }
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "";

    if (["ENOTFOUND", "ENODATA", "ESERVFAIL", "ETIMEOUT"].includes(code)) {
      return "메일 수신이 가능한 이메일 주소를 입력해주세요.";
    }

    console.error("[validateDeliverableEmail]", error);
    return "이메일 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  return null;
}
