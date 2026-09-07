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
 * 2026.05.12  임도헌   Modified  TabBar 신호 뱃지용 초기 미읽음 채팅 수 서버 주입
 * 2026.05.17  임도헌   Modified  채팅방 Realtime 구독을 탭 레이아웃 브리지 1개로 통합
 * 2026.05.18  임도헌   Modified  채팅 Realtime 브리지를 앱 전역 레이아웃으로 이동하고 탭바 초기값 주입만 유지
 * 2026.08.27  임도헌   Modified  탭 하위 화면이 공유하는 단일 main 랜드마크 책임 명시
 * 2026.08.28  임도헌   Modified  탭 레이아웃의 세션 주입 책임을 함수 JSDoc으로 보강
 */

import TabBar from "@/components/global/TabBar";
import getSession from "@/lib/session";
import { getUnreadChatMessageCount } from "@/features/chat/service/room";

/**
 * 인증 세션과 초기 미읽음 채팅 수를 주입하는 탭 공통 레이아웃
 *
 * @param props - 탭 영역에 렌더링할 하위 콘텐츠
 * @returns 단일 본문 랜드마크와 전역 탭바
 */
export default async function TabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const unreadChatCount = session?.id
    ? await getUnreadChatMessageCount(session.id)
    : 0;

  return (
    <>
      <main className="flex-1 w-full min-h-screen">{children}</main>
      <TabBar userId={session?.id} initialUnreadChatCount={unreadChatCount} />
    </>
  );
}
