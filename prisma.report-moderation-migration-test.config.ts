/**
 * File Name : prisma.report-moderation-migration-test.config.ts
 * Description : 신고 처리 멱등성 migration 전용 로컬 PostgreSQL 연결 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   운영 DB와 분리된 moderation migration datasource 추가
 */
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: { url: env("REPORT_MODERATION_MIGRATION_TEST_DATABASE_URL") },
});
