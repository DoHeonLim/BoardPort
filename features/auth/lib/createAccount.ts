/**
 * File Name : features/auth/lib/createAccount.ts
 * Description : 유저 회원가입 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  유저 회원가입 함수 분리
 * 2025.06.07  임도헌   Modified  saveUserSession 사용으로 변경
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */

import bcrypt from "bcrypt";
import db from "@/lib/db";
import { saveUserSession } from "@/features/auth/lib/saveUserSession";

export async function createAccount(data: {
  username: string;
  email: string;
  password: string;
}) {
  // 패스워드 해싱
  const hashedPassword = await bcrypt.hash(data.password, 12);
  // 유저 저장
  const user = await db.user.create({
    data: {
      username: data.username,
      email: data.email,
      password: hashedPassword,
    },
    select: { id: true },
  });
  // 로그인한 유저 저장
  return saveUserSession(user.id);
}
