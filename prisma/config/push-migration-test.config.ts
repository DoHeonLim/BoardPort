/**
 * File Name : prisma/config/push-migration-test.config.ts
 * Description : Push 소유권 migration 전용 로컬 PostgreSQL 연결 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   운영 DB와 분리된 migration 통합 테스트 datasource 추가
 * 2026.09.07  임도헌   Modified  테스트 전용 Prisma 설정을 prisma/config 경로로 정리
 */

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    // 전용 변수만 읽어 .env.local의 운영 DIRECT_URL을 실수로 사용할 수 없게 한다.
    url: env("PUSH_MIGRATION_TEST_DATABASE_URL"),
  },
});
