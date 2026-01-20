/**
 * File Name : features/auth/lib/logOut.ts
 * Description : 세션 파기(로그아웃)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/action -> logout 분리
 * 2026.01.19  임도헌   Moved      lib/auth -> features/auth/lib
 */

"use server";
import getSession from "@/lib/session";
import { redirect } from "next/navigation";

export const logOut = async () => {
  const session = await getSession();
  if (session?.destroy) session.destroy();
  redirect("/");
};
