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
 * 2026.06.29  임도헌   Modified  stale event cleanup을 advisory lock transaction 밖으로 분리
 * 2026.08.23  임도헌   Modified  로그인·SMS 검증·메일 요청·PRIVATE 방송 다중 bucket 제한 추가
 */

import "server-only";
import crypto from "node:crypto";
import db from "@/lib/db";
import {
  SIGNUP_RATE_LIMIT_MAX,
  SIGNUP_RATE_LIMIT_WINDOW_MS,
  AUTH_EMAIL_REQUEST_RATE_LIMIT_MAX,
  AUTH_EMAIL_REQUEST_RATE_LIMIT_WINDOW_MS,
  LOGIN_FAILURE_RATE_LIMIT_MAX,
  LOGIN_FAILURE_RATE_LIMIT_WINDOW_MS,
  PRIVATE_STREAM_PASSWORD_RATE_LIMIT_MAX,
  PRIVATE_STREAM_PASSWORD_RATE_LIMIT_WINDOW_MS,
  SMS_SEND_IP_RATE_LIMIT_MAX,
  SMS_SEND_IP_RATE_LIMIT_WINDOW_MS,
  SMS_VERIFY_FAILURE_RATE_LIMIT_MAX,
  SMS_VERIFY_FAILURE_RATE_LIMIT_WINDOW_MS,
} from "@/features/auth/constants";
import { getRateLimitSecret } from "@/lib/env";

const SIGNUP_RATE_LIMIT_KIND = "signup-submit-ip";
const SMS_SEND_RATE_LIMIT_KIND = "sms-send-ip";
const LOGIN_IP_RATE_LIMIT_KIND = "login-failure-ip";
const LOGIN_ACCOUNT_RATE_LIMIT_KIND = "login-failure-account";
const SMS_VERIFY_RATE_LIMIT_KIND = "sms-verify-failure-ip-phone";
const PRIVATE_STREAM_PASSWORD_RATE_LIMIT_KIND =
  "private-stream-password-failure-ip-broadcast";
const EMAIL_VERIFY_REQUEST_RATE_LIMIT_KIND = "email-verify-request-ip-email";
const PASSWORD_RESET_REQUEST_RATE_LIMIT_KIND =
  "password-reset-request-ip-email";

type AuthRateLimitResult =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

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
  const secret = getRateLimitSecret();
  if (!secret) return null;

  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

/** 여러 식별자를 정규화해 충돌 없이 hash할 인증 제한 복합 키를 만든다. */
function buildCompositeKey(parts: Array<string | number | null>): string {
  return parts
    .map((part) =>
      String(part ?? "unknown")
        .trim()
        .toLowerCase()
    )
    .join("\u001f");
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

  const windowStart = new Date(now.getTime() - input.windowMs);

  try {
    await db.authRateLimitEvent.deleteMany({
      where: {
        kind: input.kind,
        created_at: { lt: windowStart },
      },
    });
  } catch (error) {
    console.warn("[auth rate limit] stale event cleanup failed:", error);
  }

  return db.$transaction(async (tx) => {
    // PostgreSQL advisory lock은 애플리케이션이 정한 숫자 key로 잡는 DB 잠금이다.
    // 여기서는 같은 kind/keyHash 요청만 한 줄로 세워, 동시에 limit을 통과하고
    // 각각 기록되는 check-and-record 경쟁을 막는다.
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${`${input.kind}:${keyHash}`}))
    `;

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
      const resetAt = recentAttempts[0].created_at.getTime() + input.windowMs;
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

/** 성공한 인증의 실패 이력을 같은 hash bucket에서 제거한다. */
async function clearAuthRateLimitEvent(kind: string, key: string) {
  const keyHash = hashRateLimitKey(key);
  if (!keyHash) return;
  await db.authRateLimitEvent.deleteMany({ where: { kind, keyHash } });
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
      key: buildCompositeKey([ip]),
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
      key: buildCompositeKey([ip]),
      limit: SMS_SEND_IP_RATE_LIMIT_MAX,
      windowMs: SMS_SEND_IP_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
}

/** 로그인 시 IP와 계정 bucket을 모두 소비한다. 성공 시 별도로 초기화한다. */
export async function checkAndRecordLoginAttempt(
  ip: string | null,
  email: string,
  now: Date = new Date()
): Promise<AuthRateLimitResult> {
  const ipKey = buildCompositeKey([ip]);
  const accountKey = buildCompositeKey([email]);
  const ipResult = await checkAndRecordAuthRateLimitEvent(
    {
      kind: LOGIN_IP_RATE_LIMIT_KIND,
      key: ipKey,
      limit: LOGIN_FAILURE_RATE_LIMIT_MAX,
      windowMs: LOGIN_FAILURE_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
  if (!ipResult.allowed) return ipResult;

  return checkAndRecordAuthRateLimitEvent(
    {
      kind: LOGIN_ACCOUNT_RATE_LIMIT_KIND,
      key: accountKey,
      limit: LOGIN_FAILURE_RATE_LIMIT_MAX,
      windowMs: LOGIN_FAILURE_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
}

/** 로그인 성공 뒤 해당 IP·계정의 실패 이력을 함께 제거한다. */
export async function clearLoginAttempts(ip: string | null, email: string) {
  await Promise.all([
    clearAuthRateLimitEvent(LOGIN_IP_RATE_LIMIT_KIND, buildCompositeKey([ip])),
    clearAuthRateLimitEvent(
      LOGIN_ACCOUNT_RATE_LIMIT_KIND,
      buildCompositeKey([email])
    ),
  ]);
}

/** SMS 인증번호 검증 시 IP와 전화번호를 묶은 bucket을 소비한다. */
export function checkAndRecordSmsVerifyAttempt(
  ip: string | null,
  phone: string,
  now: Date = new Date()
) {
  return checkAndRecordAuthRateLimitEvent(
    {
      kind: SMS_VERIFY_RATE_LIMIT_KIND,
      key: buildCompositeKey([ip, phone]),
      limit: SMS_VERIFY_FAILURE_RATE_LIMIT_MAX,
      windowMs: SMS_VERIFY_FAILURE_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
}

/** SMS 인증 성공 뒤 IP·전화번호 실패 이력을 제거한다. */
export function clearSmsVerifyAttempts(ip: string | null, phone: string) {
  return clearAuthRateLimitEvent(
    SMS_VERIFY_RATE_LIMIT_KIND,
    buildCompositeKey([ip, phone])
  );
}

/** PRIVATE 방송 비밀번호 검증 시 IP와 방송 ID bucket을 소비한다. */
export function checkAndRecordPrivateStreamPasswordAttempt(
  ip: string | null,
  broadcastId: number,
  now: Date = new Date()
) {
  return checkAndRecordAuthRateLimitEvent(
    {
      kind: PRIVATE_STREAM_PASSWORD_RATE_LIMIT_KIND,
      key: buildCompositeKey([ip, broadcastId]),
      limit: PRIVATE_STREAM_PASSWORD_RATE_LIMIT_MAX,
      windowMs: PRIVATE_STREAM_PASSWORD_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
}

/** PRIVATE 방송 비밀번호 검증 성공 뒤 관련 실패 이력을 제거한다. */
export function clearPrivateStreamPasswordAttempts(
  ip: string | null,
  broadcastId: number
) {
  return clearAuthRateLimitEvent(
    PRIVATE_STREAM_PASSWORD_RATE_LIMIT_KIND,
    buildCompositeKey([ip, broadcastId])
  );
}

/** 이메일 요청의 IP·계정 복합 bucket을 확인하고 현재 요청을 기록한다. */
function checkAndRecordEmailRequest(
  kind: string,
  ip: string | null,
  email: string,
  now: Date
) {
  return checkAndRecordAuthRateLimitEvent(
    {
      kind,
      key: buildCompositeKey([ip, email]),
      limit: AUTH_EMAIL_REQUEST_RATE_LIMIT_MAX,
      windowMs: AUTH_EMAIL_REQUEST_RATE_LIMIT_WINDOW_MS,
    },
    now
  );
}

/** 이메일 인증 메일 요청 제한을 확인하고 기록한다. */
export function checkAndRecordEmailVerificationRequest(
  ip: string | null,
  email: string,
  now: Date = new Date()
) {
  return checkAndRecordEmailRequest(
    EMAIL_VERIFY_REQUEST_RATE_LIMIT_KIND,
    ip,
    email,
    now
  );
}

/** 비밀번호 재설정 메일 요청 제한을 확인하고 기록한다. */
export function checkAndRecordPasswordResetRequest(
  ip: string | null,
  email: string,
  now: Date = new Date()
) {
  return checkAndRecordEmailRequest(
    PASSWORD_RESET_REQUEST_RATE_LIMIT_KIND,
    ip,
    email,
    now
  );
}
