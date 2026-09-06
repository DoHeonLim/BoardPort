/**
 * File Name : prisma.release-migration-test.config.ts
 * Description : 전체 migration release smoke 전용 PostgreSQL 연결 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.28  임도헌   Created   운영 DB와 분리된 빈 DB 전체 migration 검증 datasource 추가
 */

import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // 전용 변수만 읽어 로컬 .env의 운영 DB를 실수로 대상으로 삼지 않게 한다.
    url: env("RELEASE_MIGRATION_TEST_DATABASE_URL"),
  },
});
