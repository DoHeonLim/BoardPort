/**
 * File Name : vitest.config.ts
 * Description : Vitest 단위/회귀 테스트 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   핵심 유틸/캐시 회귀 테스트용 Vitest 설정 추가
 * 2026.08.28  임도헌   Modified  TSX 컴포넌트와 파일별 jsdom 접근성 회귀 테스트 지원 추가
 * 2026.08.28  임도헌   Modified  단위 테스트 DB 모듈용 로컬 전용 DATABASE_URL 격리
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      // 앱 코드와 같은 @ alias를 테스트에서도 사용
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    // 기본은 빠른 Node 환경을 유지하고 DOM 테스트만 파일 pragma로 jsdom을 선택
    environment: "node",
    globals: false,
    // DB 모듈을 import하는 단위 테스트가 로컬 .env의 운영 URL을 읽지 않도록 격리
    env: {
      DATABASE_URL:
        "postgresql://postgres:postgres@127.0.0.1:55432/boardport_unit_test?schema=public",
    },
    setupFiles: ["./vitest.setup.ts"],
    // 소스 옆의 유틸 테스트와 React 컴포넌트 테스트를 함께 탐색
    include: ["**/*.test.{ts,tsx}"],
    // 생성물과 migration은 테스트 탐색 대상에서 제외
    exclude: ["node_modules", ".next", "generated", "prisma/migrations"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "components/**/*.{ts,tsx}",
        "features/**/*.{ts,tsx}",
        "lib/**/*.ts",
        "scripts/**/*.{ts,mjs}",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"],
      thresholds: {
        statements: 11,
        branches: 10,
        functions: 9,
        lines: 11,
      },
    },
  },
});
