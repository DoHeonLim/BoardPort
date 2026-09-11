/**
 * File Name : serwist.config.mjs
 * Description : Next 빌드 완료 후 실행하는 PWA 워커 생성 설정
 *
 * History
 * 2026.09.10 Created Turbopack과 독립된 Serwist CLI 빌드 경계 추가
 */

import { readFileSync } from "node:fs";
import { generateGlobPatterns, serwist } from "@serwist/next/config";

export default serwist.withNextConfig((nextConfig) => {
  const distDir = nextConfig.distDir.replace(/\/$/, "");
  // 로컬 재빌드에서도 offline 문서가 갱신되도록 빌드별 revision 사용
  const revision = readFileSync(`${distDir}/BUILD_ID`, "utf8").trim();

  return {
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    // 개인화 가능성이 있는 HTML의 일괄 precache 방지
    precachePrerendered: false,
    // classic 워커의 importScripts 기반 Push 핸들러 호환 유지
    esbuildOptions: { format: "iife" },
    globPatterns: [
      ...generateGlobPatterns(`${distDir}/`),
      `${distDir}/static/**/*.{woff,woff2}`,
    ],
    // 이전 PWA 빌드에서 남은 생성 파일의 재수집 방지
    globIgnores: [
      "public/{workbox-*,fallback-*,swe-worker-*,worker-*,serwist*}.js",
      "public/**/*.map",
    ],
    // 로고는 public 자동 수집에 포함되므로 중복 revision 등록 제외
    additionalPrecacheEntries: [{ url: "/offline", revision }],
  };
});
