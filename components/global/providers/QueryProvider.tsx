/**
 * File Name : components/global/providers/QueryProvider.tsx
 * Description : TanStack Query v5 전역 Provider 세팅 (Next.js App Router 호환)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.28  임도헌   Created   QueryClient 초기화 및 Provider 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.13  임도헌   Modified  React Query Devtools를 동적 로딩으로 분리해 프로덕션 공통 번들 부담을 완화
 * 2026.05.19  임도헌   Modified  서버 prefetch용 QueryClient와 같은 공용 팩토리를 사용해 기본 옵션 중복 선언 제거
 * 2026.08.13  임도헌   Modified  인증 영역을 벗어날 때 브라우저 사용자 cache 초기화 옵션 추가
 * 2026.08.21  임도헌   Modified  다른 탭의 인증 종료를 수신해 사용자 cache와 화면 상태 초기화
 * 2026.08.22  임도헌   Modified  세션 만료·다른 탭 인증 종료 시 Realtime JWT 캐시도 함께 폐기
 */
"use client";

import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getQueryClient } from "@/lib/getQueryClient";
import { subscribeToAuthContextReset } from "@/features/auth/utils/authContextReset";

const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools
    ),
  { ssr: false, loading: () => null }
);

/**
 * TanStack Query v5 전역 Provider 세팅 컴포넌트
 *
 * [상태 주입 및 제어 로직]
 * - Next.js App Router 호환 및 SSR 환경에서의 상태 오염 방지 적용
 * - `useState`를 사용한 1회성 QueryClient 인스턴스 생성
 * - 서버 prefetch와 클라이언트 Provider가 같은 `getQueryClient` 기본 옵션을 공유
 * - 불필요한 자동 갱신(refetchOnWindowFocus) 비활성화 및 기본 staleTime(1분) 적용
 */
export default function QueryProvider({
  children,
  resetOnMount = false,
}: {
  children: React.ReactNode;
  resetOnMount?: boolean;
}) {
  const isDev = process.env.NODE_ENV === "development";
  // useState를 사용하여 컴포넌트 마운트 시 단 한 번만 QueryClient를 생성
  // 공용 팩토리를 사용해 서버 prefetch와 클라이언트 Provider의 기본 옵션 drift를 방지
  const [queryClient] = useState(() => {
    const client = getQueryClient();

    // 공개 라우트 그룹으로 새로 진입했다면 로그아웃 action을 거치지 않은
    // 세션 만료/강제 인증 종료도 이전 계정의 브라우저 cache를 남기지 않는다.
    if (resetOnMount) {
      client.clear();
    }

    return client;
  });

  useEffect(() => {
    if (!resetOnMount) return;

    // Supabase SDK를 공개 페이지 공통 bundle에 넣지 않고, 이전 인증 화면에서
    // 이미 만들어진 Realtime JWT가 있을 수 있는 세션 종료 경계에서만 불러온다.
    void import("@/lib/supabase").then(({ invalidateRealtimeAccessToken }) =>
      invalidateRealtimeAccessToken()
    );
  }, [resetOnMount]);

  useEffect(
    () =>
      subscribeToAuthContextReset(() => {
        // 다른 탭에서 세션 cookie가 바뀌면 현재 트리의 viewer props도 낡는다.
        // cache를 먼저 폐기하고 전체 이동해 새 서버 세션으로 다시 렌더링한다.
        queryClient.clear();
        window.location.replace("/");
      }),
    [queryClient]
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 Devtools를 노출하여 디버깅을 돕기 위해 추가 */}
      {isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
