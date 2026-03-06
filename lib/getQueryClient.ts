/**
 * File Name : lib/getQueryClient.ts
 * Description : 서버 컴포넌트용 TanStack Query Client 싱글톤 팩토리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   SSR 환경에서의 안전한 캐시 하이드레이션을 위한 QueryClient 인스턴스 생성기 추가
 */

import { QueryClient, isServer } from "@tanstack/react-query";

/**
 * 기본 옵션이 적용된 QueryClient를 생성
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SSR 환경을 고려하여 기본 staleTime을 1분으로 설정
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * 환경 맞춤형 TanStack QueryClient 인스턴스 팩토리
 *
 * [캐시 제어 전략]
 * - 서버(SSR) 환경: 사용자 간 데이터 오염을 방지하기 위해 매 요청마다 새로운 QueryClient 인스턴스 생성 반환
 * - 클라이언트(CSR) 환경: 캐시 유지를 위한 싱글톤(Singleton) 인스턴스 생성 및 재사용 적용
 * - 기본 `staleTime` 1분 및 `refetchOnWindowFocus` 비활성화 등 글로벌 캐시 옵션 지정
 */
export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
