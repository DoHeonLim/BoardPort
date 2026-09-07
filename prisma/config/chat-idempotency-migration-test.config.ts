/**
 * File Name : prisma/config/chat-idempotency-migration-test.config.ts
 * Description : 채팅 멱등성 migration 전용 로컬 PostgreSQL 연결 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   운영 DB와 분리된 chat idempotency migration datasource 추가
 * 2026.09.07  임도헌   Modified  테스트 전용 Prisma 설정을 prisma/config 경로로 정리
 */
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: { url: env("CHAT_IDEMPOTENCY_MIGRATION_TEST_DATABASE_URL") },
});
