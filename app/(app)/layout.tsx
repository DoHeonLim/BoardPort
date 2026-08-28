/**
 * File Name : app/(app)/layout.tsx
 * Description : 로그인 후 앱 전용 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.12  임도헌   Created   앱 전역 provider와 AppWrapper를 로그인 후 영역으로 분리
 * 2026.04.13  임도헌   Modified  NotificationBoot를 동적 로딩으로 분리해 앱 공통 초기 번들 부담 완화
 * 2026.04.17  임도헌   Modified  provider 배치 순서와 지연 부트스트랩 의도가 레이아웃 설명에서 바로 드러나도록 주석 보강
 * 2026.05.18  임도헌   Modified  채팅 미읽음 Realtime 브리지를 앱 전역으로 이동해 탭 밖 채팅 상세 읽음 처리까지 동기화
 * 2026.08.23  임도헌   Modified  Next.js 16 호환 클라이언트 지연 로딩 경계로 알림 부트스트랩 분리
 * 2026.08.27  임도헌   Modified  본문 바로가기 링크가 이동할 로그인 영역 공통 포커스 대상 추가
 */
import ThemeProvider from "@/components/global/providers/ThemeProvider";
import AppWrapper from "@/components/global/AppWrapper";
import GlobalToaster from "@/components/global/GlobalToaster";
import QueryProvider from "@/components/global/providers/QueryProvider";
import { NotificationStoreProvider } from "@/components/global/providers/NotificationStoreProvider";
import { ModalStoreProvider } from "@/components/global/providers/ModalStoreProvider";
import getSession from "@/lib/session";
import ChatRoomsRealtimeBridge from "@/features/chat/components/ChatRoomsRealtimeBridge";
import NotificationBootLoader from "@/features/notification/components/NotificationBootLoader";

/**
 * 로그인 후 앱 영역 전용 루트 레이아웃
 *
 * - 테마, React Query, 알림/모달 스토어처럼 탭 전반에 걸쳐 재사용되는 provider를 한 번만 감싼다
 * - `NotificationBoot`는 동적 로딩으로 분리해 첫 렌더 공통 번들에 실시간 알림 구독 코드를 싣지 않는다
 * - 채팅 미읽음 브리지는 앱 전역에 두어 탭 밖 채팅 상세의 읽음 처리도 놓치지 않도록 유지한다
 * - `GlobalToaster`를 앱 영역 공통으로 배치해 제품/채팅/스트림/프로필 전환 중에도 일관된 토스트 레이어를 유지
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppWrapper>
        <QueryProvider>
          <NotificationStoreProvider>
            <ModalStoreProvider>
              {/* 토스트와 알림 부트스트랩의 앱 공통 chrome 내 1회 마운트 */}
              <GlobalToaster />
              <NotificationBootLoader />
              {session?.id ? (
                <ChatRoomsRealtimeBridge userId={session.id} />
              ) : null}
              <div id="main-content" tabIndex={-1} className="min-h-[100dvh]">
                {children}
              </div>
            </ModalStoreProvider>
          </NotificationStoreProvider>
        </QueryProvider>
      </AppWrapper>
    </ThemeProvider>
  );
}
