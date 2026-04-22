/**
 * File Name : app/(app)/(tabs)/layout.tsx
 * Description : 탭 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.14  임도헌   Modified  메타 데이타 변경
 * 2025.04.29  임도헌   Modified  UI 수정
 * 2025.12.12  임도헌   Modified  RootLayout(AppWrapper) 중복 제거, TabBar fixed 대응(pb-16/20) 적용
 * 2026.02.08  임도헌   Modified  서버 사이드 세션 기반 NotificationListener 주입
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/layout.tsx 에서 app/(app)/(tabs)/layout.tsx 로 변경 (라우트 그룹 개편)
 */

import TabBar from "@/components/global/TabBar";

export default function TabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 w-full min-h-screen">{children}</main>
      <TabBar />
    </>
  );
}



