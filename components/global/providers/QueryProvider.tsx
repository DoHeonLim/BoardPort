/**
 * File Name : components/global/providers/QueryProvider.tsx
 * Description : TanStack Query v5 전역 Provider 세팅 (Next.js App Router 호환)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.28  임도헌   Created   QueryClient 초기화 및 Provider 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * TanStack Query v5 전역 Provider 세팅 컴포넌트
 *
 * [상태 주입 및 제어 로직]
 * - Next.js App Router 호환 및 SSR 환경에서의 상태 오염 방지 적용
 * - `useState`를 사용한 1회성 QueryClient 인스턴스 생성
 * - 불필요한 자동 갱신(refetchOnWindowFocus) 비활성화 및 기본 staleTime(1분) 적용
 */
export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === "development";
  // useState를 사용하여 컴포넌트 마운트 시 단 한 번만 QueryClient를 생성
  // 이를 통해 다른 유저의 요청 간에 캐시가 공유되는 상태 오염을 방지
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // SSR 환경을 고려하여 기본 staleTime을 1분으로 설정
            // 즉시 refetch되는 것을 방지하여 서버 부하를 줄임
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false, // 탭 전환 시 불필요한 자동 갱신 방지
            retry: 1, // 실패 시 재시도 횟수
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 Devtools를 노출하여 디버깅을 돕기 위해 추가 */}
      {isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
