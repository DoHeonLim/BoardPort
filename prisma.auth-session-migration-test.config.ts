/**
 * File Name : prisma.auth-session-migration-test.config.ts
 * Description : sessionVersion migration 전용 로컬 PostgreSQL 연결 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   운영 DB와 분리된 인증 세션 migration datasource 추가
 */
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: { url: env("AUTH_SESSION_MIGRATION_TEST_DATABASE_URL") },
});
