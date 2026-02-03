/**
 * File Name : app/(tabs)/profile/edit/page.tsx
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
 * 2026.01.29  임도헌   Modified  프로필 편집 페이지 주석 보강 및 구조 설명 추가
 */
import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import ProfileEditForm from "@/features/user/components/profile/ProfileEditForm";
import { getCurrentUserForEdit } from "@/features/user/service/edit";
import { editProfileAction } from "@/features/user/actions/profile";

/**
 * 프로필 편집 페이지
 * - 세션 검증 후, 편집에 필요한 현재 유저 정보(`getCurrentUserForEdit`)를 조회합니다.
 * - `ProfileEditForm`에 초기값과 업데이트 액션을 주입합니다.
 */
export default async function EditProfilePage() {
  const session = await getSession();
  if (!session?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile/edit")}`);
  }

  const user = await getCurrentUserForEdit(session.id);
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile/edit")}`);
  }

  return <ProfileEditForm user={user} action={editProfileAction} />;
}
