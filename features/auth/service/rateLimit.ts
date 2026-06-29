/**
 * File Name : features/auth/service/rateLimit.ts
 * Description : 인증 경로 남용 방지용 rate limit 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.27  임도헌   Created   회원가입 IP hash 기반 단기 제출 제한 추가
 * 2026.06.27  임도헌   Modified  SMS 발송 IP hash 기반 시간당 제한 추가
 * 2026.06.27  임도헌   Modified  kind/keyHash 단위 transaction advisory lock 적용
 */

import "server-only";
import crypto from "node:crypto";
import db from "@/lib/db";
import {
  SIGNUP_RATE_LIMIT_MAX,
  SIGNUP_RATE_LIMIT_WINDOW_MS,
  SMS_SEND_IP_RATE_LIMIT_MAX,
  SMS_SEND_IP_RATE_LIMIT_WINDOW_MS,
} from "@/features/auth/constants";

const SIGNUP_RATE_LIMIT_KIND = "signup-submit-ip";
const SMS_SEND_RATE_LIMIT_KIND = "sms-send-ip";

type AuthRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * 요청 헤더에서 rate limit 식별용 클라이언트 IP 후보를 추출
 *
 * @param {Headers} headers - 현재 요청 헤더
 * @returns {string | null} 식별 가능한 IP 후보
 */
export function getClientIpFromHeaders(headers: Headers): string | null {
  const forwardedFor = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);

  return (
    forwardedFor ??
    headers.get("x-real-ip")?.trim() ??
    headers.get("cf-connecting-ip")?.trim() ??
    null
  );
}

/**
 * rate limit 식별자를 저장용 HMAC hash로 변환
 *
 * @param {string} value - IP 등 rate limit 식별자 원문
 * @returns {string | null} 저장 가능한 hash 값
 */
export function hashRateLimitKey(value: string): string | null {
  const secret = process.env.RATE_LIMIT_SALT ?? process.env.COOKIE_PASSWORD;
  if (!secret) return null;

  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * 인증 rate limit 이벤트를 조회하고 허용 시 현재 요청을 기록
 *
 * @param {{ kind: string; key: string | null; limit: number; windowMs: number }} input - 정책 종류, 식별자, 제한 수, 시간 창
 * @param {Date} now - 테스트와 계산 기준 시각
 * @returns {Promise<AuthRateLimitResult>} 허용 여부와 제한 시 남은 대기 시간
 */
async function checkAndRecordAuthRateLimitEvent(
  input: {
    kind: string;
    key: string | null;
    limit: number;
    windowMs: number;
  },
  now: Date = new Date()
): Promise<AuthRateLimitResult> {
  if (!input.key) return { allowed: true };

  const keyHash = hashRateLimitKey(input.key);
  if (!keyHash) return { allowed: true };

  return db.$transaction(async (tx) => {
    // 같은 정책/식별자에 대한 check-and-record 경쟁을 DB transaction 단위로 직렬화
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${`${input.kind}:${keyHash}`}))
    `;

    const windowStart = new Date(now.getTime() - input.windowMs);

    try {
      await tx.authRateLimitEvent.deleteMany({
        where: {
          kind: input.kind,
          created_at: { lt: windowStart },
        },
      });
    } catch (error) {
      console.warn("[auth rate limit] stale event cleanup failed:", error);
    }

    const recentAttempts = await tx.authRateLimitEvent.findMany({
      where: {
        kind: input.kind,
        keyHash,
        created_at: { gte: windowStart },
      },
      orderBy: { created_at: "asc" },
      select: { created_at: true },
    });

    if (recentAttempts.length >= input.limit) {
      const resetAt =
        recentAttempts[0].created_at.getTime() + input.windowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetAt - now.getTime()) / 1000)
      );

      return { allowed: false, retryAfterSeconds };
    }

    await tx.authRateLimitEvent.create({
      data: {
        kind: input.kind,
        keyHash,
        created_at: now,
      },
    });

    return { allowed: true };
  });
}

/**
 * 회원가입 제출에 대한 IP 기준 단기 rate limit을 확인하고 기록
 *
 * @param {string | null} ip - 요청 IP 후보
 * @param {Date} now - 테스트와 계산 기준 시각
 * @returns {Promise<AuthRateLimitResult>} 허용 여부와 제한 시 남은 대기 시간
 */
export async function checkAndRecordSignupAttemptByIp(
  ip: string | null,
  now: Date = new Date()
): Promise<AuthRateLimitResult> {
  return checkAndRecordAuthRateLimitEvent(
    {
      kind: SIGNUP_RATE_LIMIT_KIND,
      key: ip,
      limit: SIGNUP_RATE_LIMIT_MAX,
      windowMs: SIGNUP_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
}

/**
 * SMS 인증 발송에 대한 IP 기준 rate limit을 확인하고 기록
 *
 * @param {string | null} ip - 요청 IP 후보
 * @param {Date} now - 테스트와 계산 기준 시각
 * @returns {Promise<AuthRateLimitResult>} 허용 여부와 제한 시 남은 대기 시간
 */
export async function checkAndRecordSmsSendAttemptByIp(
  ip: string | null,
  now: Date = new Date()
): Promise<AuthRateLimitResult> {
  return checkAndRecordAuthRateLimitEvent(
    {
      kind: SMS_SEND_RATE_LIMIT_KIND,
      key: ip,
      limit: SMS_SEND_IP_RATE_LIMIT_MAX,
      windowMs: SMS_SEND_IP_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
}
