/**
 * File Name : app/(auth)/login/actions
 * Description : 로그인 페이지 Form 제출 시
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  폼 제출 및 검증 기능 추가
 * 2024.10.06  임도헌   Modified  로그인 기능 완성
 * 2025.05.30  임도헌   Modified  비즈니스 로직 분리
 * 2025.06.07  임도헌   Modified  리디렉션 제거
 * 2025.12.10  임도헌   Modified  로그인 액션 리턴 타입(success/fieldErrors) 구조화 및 예외 처리 준비
 */
"use server";

import { verifyLogin } from "@/features/auth/lib/login";
import { saveUserSession } from "@/features/auth/lib/saveUserSession";
import { loginSchema } from "@/features/auth/lib/loginSchema";
import db from "@/lib/db";

type LoginResult =
  | {
      success: false;
      fieldErrors: Record<string, string[]>;
    }
  | {
      success: true;
    };

const handleCheckEmailExists = async (email: string) => {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return Boolean(user);
};

export async function login(
  _prevState: unknown,
  formData: FormData
): Promise<LoginResult> {
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = await loginSchema.safeParseAsync(data);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { success: false, fieldErrors };
  }

  const existUser = await handleCheckEmailExists(parsed.data.email);
  if (!existUser) {
    return {
      success: false,
      fieldErrors: {
        email: ["존재하지 않는 이메일입니다."],
      },
    };
  }

  const userId = await verifyLogin(parsed.data);

  if (!userId) {
    return {
      success: false,
      fieldErrors: {
        password: ["잘못된 비밀번호입니다."],
      },
    };
  }

  // 세션 저장
  await saveUserSession(userId);

  // 리다이렉트는 클라이언트에서 처리 (callbackUrl 사용)
  return { success: true };
}
