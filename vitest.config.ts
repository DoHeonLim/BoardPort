/**
 * File Name : vitest.config.ts
 * Description : Vitest 단위/회귀 테스트 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   핵심 유틸/캐시 회귀 테스트용 Vitest 설정 추가
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
    // DOM 없이 순수 유틸/스키마/cache 변환만 검증
    environment: "node",
    globals: false,
    // 기존 소스 옆의 *.test.ts 파일을 테스트 대상으로 지정
    include: ["**/*.test.ts"],
    // 생성물과 migration은 테스트 탐색 대상에서 제외
    exclude: ["node_modules", ".next", "generated", "prisma/migrations"],
  },
});
