/**
 * File Name : app/(app)/(tabs)/profile/edit/page.tsx
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
 * 2026.03.13  임도헌   Modified  returnTo 쿼리를 정규화해 저장/취소 후 복귀 경로로 사용
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/edit/page.tsx 에서 app/(app)/(tabs)/profile/edit/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.25  임도헌   Modified  ProfileEditForm 서버 액션 prop 전달을 제거해 클라이언트 entry 직렬화 경고를 해소
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */
import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import ProfileEditForm from "@/features/user/components/profile/ProfileEditForm";
import { getCurrentUserForEdit } from "@/features/user/service/edit";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

/**
 * 프로필 편집 페이지
 * - 세션 검증 후, 편집에 필요한 현재 유저 정보(`getCurrentUserForEdit`)를 조회
 * - `ProfileEditForm`에 초기값과 복귀 경로를 주입
 */
export default async function EditProfilePage(props: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const returnTo = sanitizeCallbackUrl(searchParams?.returnTo ?? "/profile");

  const session = await getSession();
  if (!session?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/profile/edit?returnTo=${encodeURIComponent(returnTo)}`
      )}`
    );
  }

  const user = await getCurrentUserForEdit(session.id);
  if (!user) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/profile/edit?returnTo=${encodeURIComponent(returnTo)}`
      )}`
    );
  }

  return <ProfileEditForm user={user} returnTo={returnTo} />;
}
