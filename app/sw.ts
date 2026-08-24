/**
 * File Name : app/sw.ts
 * Description : Serwist 기반 오프라인 캐시 및 푸시 알림 서비스 워커
 *
 * History
 * 2026.08.23 Created next-pwa를 Serwist로 전환하고 기존 푸시 표시 보호 로직 연동
 */

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";
import { isPwaStaticAssetPath } from "@/features/notification/utils/pwaCachePolicy";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 기존 보안 검증이 포함된 푸시 이벤트 핸들러를 메인 서비스 워커에 연결한다.
self.importScripts("/pwa-push.js?guard=1");

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
      matcher: /.*/i,
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
