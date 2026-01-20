/**
 * File Name : features/user/lib/profile/changePassword.ts
 * Description : 비밀번호 변경 도메인 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created    기존 action에서 분리
 * 2025.10.29  임도헌   Modified   예외 처리/표준 에러 응답 보강
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

"use server";

import bcrypt from "bcrypt";
import db from "@/lib/db";
import getSession from "@/lib/session";
import { passwordChangeSchema } from "@/features/user/lib/profile/passwordChangeSchema";

export type ChangePasswordResponse = {
  success: boolean;
  errors?: {
    currentPassword?: string[];
    password?: string[];
    confirmPassword?: string[];
    _?: string[]; // 기타 에러
  };
};

export const changePassword = async (
  formData: FormData
): Promise<ChangePasswordResponse> => {
  try {
    const session = await getSession();
    if (!session?.id) {
      return {
        success: false,
        errors: { currentPassword: ["로그인이 필요합니다."] },
      };
    }

    const data = {
      currentPassword: formData.get("currentPassword"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    const parsed = passwordChangeSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { password: true },
    });
    if (!user?.password) {
      return {
        success: false,
        errors: { currentPassword: ["비밀번호 변경이 불가능한 계정입니다."] },
      };
    }

    const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!ok) {
      return {
        success: false,
        errors: { currentPassword: ["현재 비밀번호가 일치하지 않습니다."] },
      };
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12);
    await db.user.update({
      where: { id: session.id },
      data: { password: hashed },
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      errors: { _: ["서버 처리 중 오류가 발생했습니다. 다시 시도해 주세요."] },
    };
  }
};
