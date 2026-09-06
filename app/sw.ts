/**
 * File Name : app/sw.ts
 * Description : Serwist 기반 오프라인 캐시 및 푸시 알림 서비스 워커
 *
 * History
 * 2026.08.23 Created next-pwa를 Serwist로 전환하고 기존 푸시 표시 보호 로직 연동
 * 2026.08.30 Modified 정적 자산·문서 탐색만 가로채 RSC 요청 취소의 no-response 오류 차단
 * 2026.09.01 Modified 서비스 워커 활성화 시 구형 next-pwa 개인화 캐시 제거
 */

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";
import {
  isLegacyPwaCacheName,
  isPwaDocumentNavigation,
  isPwaStaticAssetPath,
} from "@/features/notification/utils/pwaCachePolicy";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 기존 보안 검증이 포함된 푸시 이벤트 핸들러를 메인 서비스 워커에 연결한다.
self.importScripts("/pwa-push.js?guard=1");

/**
 * next-pwa가 남긴 API·RSC·개인화 이미지 캐시를 현재 서비스 워커 활성화 시 제거한다.
 */
async function deleteLegacyPwaCaches() {
  const cacheNames = await self.caches.keys();
  const legacyCacheNames = cacheNames.filter(isLegacyPwaCacheName);

  await Promise.all(
    legacyCacheNames.map((cacheName) => self.caches.delete(cacheName))
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteLegacyPwaCaches());
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // API·RSC·HTML에는 사용자별 정보가 포함되므로 runtime cache에 저장하지 않는다.
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && isPwaStaticAssetPath(url.pathname),
      handler: new CacheFirst({
        cacheName: "boardport-static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 96,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    {
      // API·RSC·prefetch는 등록하지 않아 브라우저가 직접 네트워크로 처리한다.
      // 실제 문서 탐색만 NetworkOnly로 처리해 실패 시 /offline을 제공한다.
      matcher: ({ sameOrigin, request }) =>
        sameOrigin && isPwaDocumentNavigation(request),
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return isPwaDocumentNavigation(request);
        },
      },
    ],
  },
});

serwist.addEventListeners();
