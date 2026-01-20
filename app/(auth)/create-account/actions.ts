/**
 * File Name : app/(auth)/create-account/actions
 * Description : 회원가입 페이지 server 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  폼 제출 및 검증 기능 추가
 * 2024.10.06  임도헌   Modified  세션 추가 및 회원가입 기능 완성
 * 2025.05.30  임도헌   Modified  비즈니스 로직 분리
 * 2025.12.10  임도헌   Modified  회원가입 액션 리턴 타입(success/fieldErrors) 구조화 및 예외 처리 로직 개선
 */
"use server";

import { createAccount } from "@/features/auth/lib/createAccount";
import { createAccountSchema } from "@/features/auth/lib/createAccountSchema";
import db from "@/lib/db";

type SubmitCreateAccountResult =
  | {
      success: false;
      fieldErrors: Record<string, string[]>;
    }
  | {
      success: true;
    };

export async function submitCreateAccount(
  _: unknown,
  formData: FormData
): Promise<SubmitCreateAccountResult> {
  const data = {
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = await createAccountSchema.safeParseAsync(data);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { success: false, fieldErrors };
  }

  // 중복 체크
  const [existingUsername, existingEmail] = await Promise.all([
    db.user.findUnique({
      where: { username: parsed.data.username },
      select: { id: true },
    }),
    db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    }),
  ]);

  const fieldErrors: Record<string, string[]> = {};
  if (existingUsername) {
    fieldErrors.username = ["이미 존재하는 유저명입니다."];
  }
  if (existingEmail) {
    fieldErrors.email = ["이미 존재하는 이메일입니다."];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  // 유저 생성 + 세션 저장
  await createAccount(parsed.data);

  return { success: true };
}
