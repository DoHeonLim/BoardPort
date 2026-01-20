/**
 * File Name : app/(tabs)/profile/edit/page
 * Description : 프로필 수정 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.25  임도헌   Created
 * 2024.11.25  임도헌   Modified  프로필 페이지 레이아웃 추가
 * 2024.12.15  임도헌   Modified  다크모드 적용
 * 2025.10.08  임도헌   Modified  getUser 변경(getCurrentUserForProfileEdit)
 * 2025.10.31  임도헌   Modified  세션 없으면 /login 으로 redirect(callbackUrl 포함)
 * 2026.01.15  임도헌   Modified  레이아웃 정리
 */

import { redirect } from "next/navigation";
import ProfileEditForm from "@/features/user/components/profile/ProfileEditForm";
import { getCurrentUserForProfileEdit } from "@/features/user/lib/getCurrentUserForProfileEdit";
import { editProfile } from "@/features/user/lib/profile/editProfile";

export default async function EditProfilePage() {
  const user = await getCurrentUserForProfileEdit();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile/edit")}`);
  }

  return <ProfileEditForm user={user} action={editProfile} />;
}
