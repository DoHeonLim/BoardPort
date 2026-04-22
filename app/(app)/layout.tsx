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
 */
import dynamic from "next/dynamic";
import ThemeProvider from "@/components/global/providers/ThemeProvider";
import AppWrapper from "@/components/global/AppWrapper";
import GlobalToaster from "@/components/global/GlobalToaster";
import QueryProvider from "@/components/global/providers/QueryProvider";
import { NotificationStoreProvider } from "@/components/global/providers/NotificationStoreProvider";
import { ModalStoreProvider } from "@/components/global/providers/ModalStoreProvider";

const NotificationBoot = dynamic(
  () => import("@/features/notification/components/NotificationBoot"),
  { ssr: false, loading: () => null }
);

/**
 * 로그인 후 앱 영역 전용 루트 레이아웃
 *
 * - 테마, React Query, 알림/모달 스토어처럼 탭 전반에 걸쳐 재사용되는 provider를 한 번만 감싼다
 * - `NotificationBoot`는 동적 로딩으로 분리해 첫 렌더 공통 번들에 실시간 알림 구독 코드를 싣지 않는다
 * - `GlobalToaster`를 앱 영역 공통으로 배치해 제품/채팅/스트림/프로필 전환 중에도 일관된 토스트 레이어를 유지
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
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
              <NotificationBoot />
              {children}
            </ModalStoreProvider>
          </NotificationStoreProvider>
        </QueryProvider>
      </AppWrapper>
    </ThemeProvider>
  );
}
