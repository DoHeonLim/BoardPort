/**
 * File Name : prisma.media-migration-test.config.ts
 * Description : MediaAsset ownership migration 전용 로컬 PostgreSQL 연결 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   운영 DB와 분리된 이미지 소유권 migration datasource 추가
 */
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: { url: env("MEDIA_MIGRATION_TEST_DATABASE_URL") },
});
