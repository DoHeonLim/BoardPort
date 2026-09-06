/**
 * File Name : scripts/migration-test-targets.mjs
 * Description : migration 통합 테스트 대상 공통 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   일반·Docker 실행기가 공유하는 도메인별 테스트 메타데이터 분리
 */

export const migrationTestTargets = [
  {
    key: "push",
    name: "Push ownership",
    envName: "PUSH_MIGRATION_TEST_DATABASE_URL",
    script: "test-push-ownership-migration.mjs",
  },
  {
    key: "realtime",
    name: "Realtime authorization",
    envName: "REALTIME_MIGRATION_TEST_DATABASE_URL",
    script: "test-realtime-authorization-migration.mjs",
  },
  {
    key: "media",
    name: "MediaAsset ownership",
    envName: "MEDIA_MIGRATION_TEST_DATABASE_URL",
    script: "test-media-asset-migration.mjs",
  },
  {
    key: "auth-session",
    name: "Auth session",
    envName: "AUTH_SESSION_MIGRATION_TEST_DATABASE_URL",
    script: "test-auth-session-migration.mjs",
  },
  {
    key: "report-moderation",
    name: "Report moderation",
    envName: "REPORT_MODERATION_MIGRATION_TEST_DATABASE_URL",
    script: "test-report-moderation-migration.mjs",
  },
  {
    key: "chat-idempotency",
    name: "Chat idempotency",
    envName: "CHAT_IDEMPOTENCY_MIGRATION_TEST_DATABASE_URL",
    script: "test-chat-idempotency-migration.mjs",
  },
  {
    key: "product-trade",
    name: "Product trade",
    envName: "PRODUCT_TRADE_MIGRATION_TEST_DATABASE_URL",
    script: "test-product-trade-migration.mjs",
  },
  {
    key: "stream-webhook",
    name: "Stream webhook",
    envName: "STREAM_WEBHOOK_MIGRATION_TEST_DATABASE_URL",
    script: "test-stream-webhook-migration.mjs",
  },
  {
    key: "vod-pagination",
    name: "VOD pagination",
    envName: "VOD_PAGINATION_MIGRATION_TEST_DATABASE_URL",
    script: "test-vod-pagination-migration.mjs",
  },
];
