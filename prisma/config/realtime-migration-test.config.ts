/**
 * File Name : prisma/config/realtime-migration-test.config.ts
 * Description : Realtime Authorization migration 전용 로컬 PostgreSQL 연결 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   운영 DB와 분리된 RLS migration 통합 테스트 datasource 추가
 * 2026.09.07  임도헌   Modified  테스트 전용 Prisma 설정을 prisma/config 경로로 정리
 */

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    url: env("REALTIME_MIGRATION_TEST_DATABASE_URL"),
  },
});
