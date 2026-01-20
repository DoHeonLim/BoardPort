/**
 * File Name : features/auth/lib/email/verifyEmail.ts
 * Description : 이메일 인증 서버 액션 (토큰 전송/검증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.04.13  임도헌   Created    최초 구현: app/api/email/verify/actions
 * 2025.04.21  임도헌   Modified   성공 시 redirect 대신 success 플래그 반환
 * 2025.10.14  임도헌   Moved      app/api/email/verify/actions → lib/auth/email/verifyEmail.ts 로 이동
 * 2025.10.14  임도헌   Modified   토큰/메일러 유틸 분리(import)
 * 2025.10.29  임도헌   Modified   재전송 쿨다운 서버 강제(180s) + 기존 토큰 유지,
 *                                 cooldownRemaining/sent 반환, 모달 닫아도 우회 불가
 * 2025.12.07  임도헌   Modified   VERIFIED_SAILOR 뱃지 체크를 badgeChecks.onVerificationUpdate로 통일
 * 2025.12.12  임도헌   Modified   intent(request/resend/verify) 기반 분기,
 *                                 재오픈/자동요청 시 "검증 브랜치 오진입" 방지,
 *                                 token 검증은 서버에서 DB로 직접 처리(Prisma where 안전화)
 * 2025.12.13  임도헌   Modified   Zod flatten 에러를 formErrors 1줄로 정규화(토스트 안정화)
 * 2026.01.06  임도헌   Modified   쿨다운 계산을 created_at 기반으로 명확화(SSOT),
 *                                 클라 localStorage 쿨다운 UX와 서버 쿨다운을 항상 동기화
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */
"use server";

import { z, typeToFlattenedError } from "zod";
import validator from "validator";
import db from "@/lib/db";
import * as T from "@/lib/cacheTags";
import { revalidateTag } from "next/cache";
import { badgeChecks } from "@/features/user/lib/badges";
import { handleGetToken } from "@/features/auth/lib/email/token";
import { sendEmail } from "@/features/auth/lib/email/mailer";
import type { IActionState } from "@/features/auth/lib/email/verifyEmailState";

const emailSchema = z
  .string()
  .trim()
  .refine((email) => validator.isEmail(email), "잘못된 이메일 형식입니다.");

const tokenFormatSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "인증번호는 6자리 입니다.");

const RESEND_COOLDOWN_SECONDS = 180; // 3분 (서버 SSOT)
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10분 유효

type Intent = "request" | "resend" | "verify";
function parseIntent(v: unknown): Intent {
  if (v === "resend") return "resend";
  if (v === "verify") return "verify";
  return "request";
}

/** Zod flatten 결과에서 사용자에게 보여줄 첫 메시지 1개 추출 */
function firstZodMessage(flat: typeToFlattenedError<string, string>): string {
  const fromForm = flat.formErrors?.[0];
  if (fromForm) return fromForm;

  for (const msgs of Object.values(flat.fieldErrors ?? {})) {
    const msg = msgs?.[0];
    if (msg) return msg;
  }

  return "인증에 실패했습니다.";
}

function calcCooldownRemainingFromCreatedAt(createdAt: Date): number {
  const elapsedSeconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
}

// 이 파일에서 export는 오직 async function(서버액션)만!
export async function verifyEmail(
  prevState: IActionState,
  formData: FormData
): Promise<IActionState> {
  const intent = parseIntent(formData.get("intent"));
  const emailRaw = formData.get("email") ?? prevState.email ?? "";
  const emailParsed = emailSchema.safeParse(emailRaw);

  if (!emailParsed.success) {
    const flat = emailParsed.error.flatten();
    return { token: false, error: { formErrors: [firstZodMessage(flat)] } };
  }
  const email = emailParsed.data;

  /**
   * request / resend
   * - request: 모달 오픈 시 자동 호출(토큰/쿨다운 동기화 목적) + 필요 시 최초 발송
   * - resend : 유저가 재전송 버튼을 눌렀을 때만 호출
   *
   * 정책: "서버 쿨다운(SSOT)"이 남아있으면 절대 메일 발송/토큰 재생성하지 않는다.
   * 클라(localStorage) 쿨다운은 UX 유지용이며, 서버가 최종 판단.
   */
  if (intent === "request" || intent === "resend") {
    const latest = await db.emailToken.findFirst({
      where: { email },
      orderBy: { created_at: "desc" },
      select: { id: true, created_at: true, expires_at: true },
    });

    if (latest) {
      const remain = calcCooldownRemainingFromCreatedAt(latest.created_at);

      if (remain > 0) {
        // 쿨다운 중이면 아무 작업도 하지 않음(삭제/재발급/재전송 금지)
        return {
          token: true,
          email,
          cooldownRemaining: remain,
          sent: false,
        };
      }
    }

    // 쿨다운이 끝났으면 기존 토큰은 정리하고 새 토큰 발송
    await db.emailToken.deleteMany({ where: { email } });

    const code = await handleGetToken();
    await db.emailToken.create({
      data: {
        token: code,
        email,
        expires_at: new Date(Date.now() + TOKEN_TTL_MS),
        user: { connect: { email } },
      },
    });

    await sendEmail(email, code);

    return {
      token: true,
      email,
      cooldownRemaining: RESEND_COOLDOWN_SECONDS,
      sent: true,
    };
  }

  /**
   * verify
   * - 6자리 토큰 검증 (DB에서 email+token+expires_at 조건으로 직접 조회)
   * - 성공 시 token row 삭제 + user.emailVerified 업데이트
   */
  const tokenRaw = formData.get("token");
  const tokenParsed = tokenFormatSchema.safeParse(tokenRaw);

  if (!tokenParsed.success) {
    const flat = tokenParsed.error.flatten();
    return {
      token: true,
      email,
      error: { formErrors: [firstZodMessage(flat)] },
    };
  }
  const token = tokenParsed.data;

  const tokenRow = await db.emailToken.findFirst({
    where: { email, token, expires_at: { gte: new Date() } },
    select: { id: true, userId: true },
  });

  if (!tokenRow) {
    return {
      token: true,
      email,
      error: { formErrors: ["이메일과 인증번호가 일치하지 않습니다."] },
    };
  }

  await db.emailToken.delete({ where: { id: tokenRow.id } });

  await db.user.update({
    where: { id: tokenRow.userId },
    data: { emailVerified: true },
  });

  await badgeChecks.onVerificationUpdate(tokenRow.userId);

  // 프로필/뱃지 쪽 즉시 최신화
  revalidateTag(T.USER_CORE_ID(tokenRow.userId));
  revalidateTag(T.USER_BADGES_ID(tokenRow.userId));

  return { token: true, email, success: true };
}
