# Cloudflare Stream Webhook 멱등성·순서 제어

Cloudflare 웹훅은 중복 전달되거나 provider에서 발생한 순서와 다르게 도착할 수 있습니다. BoardPort는 웹훅을 한 번만 오는 명령이 아니라 재전송 가능한 외부 이벤트로 취급합니다.

## 1. 처리 구조

1. Route Handler가 raw body 서명 또는 Destination secret을 검증합니다.
2. source와 raw body의 SHA-256을 `CloudflareWebhookEvent.payloadHash`로 저장합니다.
3. 고유 해시에 성공한 처리자만 inbox 이벤트를 `PROCESSING`으로 선점합니다.
4. 도메인 상태와 outbox 작업을 같은 DB transaction에서 확정합니다.
5. commit 뒤 알림, Realtime, 썸네일 조회, cache 무효화를 실행합니다.
6. outbox 실패 작업은 지수형 backoff로 되돌리고 일일 cron에서도 재시도합니다.

핵심 DB 상태 전이가 실패하면 Route Handler는 inbox를 `FAILED`로 기록하고 500을 반환합니다. Cloudflare 재전송과 일일 cron은 같은 inbox를 다시 선점할 수 있고, 처리 도중 중단되어 오래 `PROCESSING`에 남은 이벤트도 cron이 복구합니다. 반대로 외부 후처리 실패는 이미 commit된 도메인 상태를 실패로 되돌리지 않습니다.

## 2. 이벤트 순서 정책

### Live Input 연결·종료

`Broadcast.lastProviderEventAt`보다 새로운 provider 이벤트만 반영합니다. 늦게 도착한 `disconnected`가 이미 재연결된 방송을 다시 종료하거나, 오래된 `connected`가 종료 방송을 되살리는 것을 막습니다.

방송 세션 경계는 다음 필드로 저장합니다.

- `providerSessionStartedAt`: Cloudflare 연결 이벤트 시각
- `providerSessionEndedAt`: Cloudflare 종료 이벤트 시각
- `lastProviderEventAt`: 마지막으로 반영한 상태 이벤트 시각

방송 시작 알림 outbox와 인앱 알림은 Broadcast ID 기반 고유 키를 사용합니다. 서로 다른 payload로 연결 이벤트가 다시 와도 같은 방송의 시작 알림을 새로 만들지 않습니다.

### 녹화 VOD

`video.ready`의 asset `created`가 포함되는 provider 세션을 찾아 `VodAsset.broadcastId`를 결정합니다. Cloudflare가 video record를 만든 시각과 `connected` 알림 시각의 수 초 차이를 고려해 시작 경계에만 60초 허용치를 적용하고, 종료 경계와 가장 가까운 최신 세션 조건은 그대로 유지합니다. 단순히 가장 최근 종료 방송을 선택하지 않으므로 연속 방송과 지연 웹훅에서도 녹화본이 다른 Broadcast에 연결되지 않습니다.

같은 asset UID가 다시 도착하면 `VodAsset.lastProviderEventAt`보다 새로운 이벤트만 upsert합니다.

### 게시글 동영상

`PostVideo`는 `UPLOADING` 또는 `PROCESSING`에서만 `READY`/`FAILED`로 전환합니다. 먼저 반영된 terminal 상태를 뒤늦은 반대 이벤트가 되돌리지 않습니다.

## 3. Outbox 운영

`StreamWebhookOutbox`에는 다음 작업이 저장됩니다.

- 방송 상태 Realtime 무효화 신호
- 팔로워 방송 시작 알림
- Cloudflare 방송 썸네일 보완
- 방송·게시글 cache tag 무효화

작업은 `dedupeKey`로 중복 적재를 막고 `FOR UPDATE SKIP LOCKED`로 한 처리자만 선점합니다. 실패하면 최대 8회까지 지수형 backoff를 적용하며, 즉시 웹훅 처리와 `/api/cron/check-badges` 운영 배치가 같은 실행기를 사용합니다. 연결 직후 녹화 썸네일이 아직 준비되지 않은 경우도 실패로 남겨 다음 batch에서 다시 조회합니다.

## 4. Migration 검증과 배포 순서

로컬 PostgreSQL 16의 전용 DB에서 다음 통합 테스트를 실행합니다.

```bash
STREAM_WEBHOOK_MIGRATION_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/boardport_migration_test?schema=public" \
npm run test:migration:stream-webhook
```

이 테스트는 provider 시각 backfill, inbox/outbox unique·CHECK·FK 제약, cascade 삭제, migration 재실행 안전성을 검증합니다. 테스트 스크립트는 `localhost`의 `boardport_migration_test`만 허용하며 운영 DB URL을 거부합니다.

배포 순서:

1. 로컬 migration 통합 테스트와 전체 품질 게이트 통과
2. `npx prisma migrate status`로 미적용 migration 확인
3. `npx prisma migrate deploy`로 production schema 선적용
4. `npx prisma migrate status`가 최신 상태인지 확인
5. 새 코드 배포
6. 중복·역순·연속 방송·outbox 재시도 smoke test

새 컬럼과 테이블을 기존 코드가 참조하지 않으므로 schema를 먼저 적용할 수 있습니다. 새 코드를 먼저 배포하면 inbox/outbox 테이블을 찾지 못해 웹훅이 500으로 재시도되므로 migration 선적용을 권장합니다.

## 5. 운영 확인 항목

- 같은 raw payload 재전송 시 inbox 행과 상태 변경이 늘어나지 않는가?
- `lastProviderEventAt`보다 오래된 이벤트가 `IGNORED`로 마감되는가?
- 녹화 asset 생성 시각이 해당 Broadcast provider 세션 안에 있는가?
- `FAILED` inbox가 Cloudflare 재전송으로 다시 처리되는가?
- `PENDING` outbox가 cron 실행 뒤 `COMPLETED`로 전환되는가?
- 동일 Broadcast의 시작 알림 `deliveryKey`가 사용자별로 하나만 존재하는가?

## 관련 문서

- [게시글 동영상 Cloudflare 웹훅 상태 전환](../troubleshooting/troubleshooting-post-video-cloudflare-webhook.md)
- [Cloudflare Stream Signed Playback 전환 절차](./stream-signed-playback-runbook.md)
- [테스트 전략](./testing-strategy.md)
- [CI/CD 워크플로우](./ci-cd-workflows.md)
