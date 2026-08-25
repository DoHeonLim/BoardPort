# 신고 처리 원자성·멱등성 운영 기준

관리자 신고 승인은 신고 상태만 바꾸는 작업이 아닙니다. strike 기록, 콘텐츠 삭제, 계정 정지, 감사 로그, 사용자 알림과 외부 Cloudflare 자산 정리가 함께 발생합니다. 이 문서는 동시 처리와 부분 실패가 발생해도 DB 상태와 외부 효과가 안전하게 수렴하도록 만든 기준을 정리합니다.

## 1. 처리 경계

DB에서 반드시 함께 성공하거나 함께 롤백해야 하는 작업은 하나의 `Serializable` transaction으로 처리합니다.

1. 동일한 `(reportId, action)` 감사 로그가 이미 완료됐는지 확인
2. `PENDING → PROCESSING` 조건부 갱신으로 단일 처리자 claim
3. strike와 경고·정지·콘텐츠 삭제 같은 DB 조치 수행
4. 신고를 `RESOLVED` 또는 `DISMISSED`로 변경
5. 고유 `idempotencyKey`를 가진 최종 감사 로그 기록
6. 알림·실시간 신호·외부 자산 삭제를 `ModerationOutbox`에 저장
7. transaction commit

어느 단계에서든 DB 오류가 발생하면 `PROCESSING` claim을 포함한 모든 변경이 롤백되어 신고는 다시 `PENDING` 상태로 돌아갑니다.

## 2. 동시 실행과 재시도

- 두 관리자가 같은 신고를 동시에 처리하면 `status = PENDING` 조건을 먼저 갱신한 한 명만 claim에 성공합니다.
- 같은 조치를 다시 요청하면 `report:{reportId}:{status}:{action}` 형식의 감사 로그 멱등 키를 확인하고 성공 응답으로 수렴합니다.
- 이미 다른 조치로 완료된 신고는 재처리하지 않습니다.
- strike, 콘텐츠 삭제, 계정 정지 감사 로그는 최종 멱등 감사 로그와 같은 transaction에 있으므로 일부만 남지 않습니다.

## 3. Moderation outbox

네트워크 호출은 DB transaction 안에서 실행하지 않습니다. 다음 작업은 commit과 함께 outbox에 저장한 뒤 처리합니다.

- 관리자 조치 인앱 알림·Realtime 알림·Web Push
- 계정 정지 Realtime 강제 종료 신호
- Cloudflare Images 삭제
- 게시글 첨부 Stream 자산 삭제
- 방송 VOD·썸네일 자산 삭제

각 작업은 `dedupeKey`가 고유합니다. 관리자 알림은 같은 키를 `Notification.deliveryKey`에도 저장해 outbox 재시도 중 인앱 알림이 중복 생성되지 않도록 합니다.

처리는 신고 transaction commit 직후 한 번 시도합니다. 실패 작업은 `PENDING`으로 되돌리고 1·2·4·8분 순서의 지수형 backoff를 적용하며, 최대 60분으로 제한합니다. 8회 실패하면 `FAILED`로 격리합니다. 일일 `check-badges` 운영 cron이 남은 작업을 다시 처리하고, 10분 이상 `PROCESSING`에 머문 작업도 실행 중단으로 판단해 다시 claim합니다.

## 4. 운영 확인 쿼리

상태별 outbox 적재량을 확인합니다.

```sql
select
  "status",
  "kind",
  count(*) as job_count,
  max("attempts") as max_attempts
from "ModerationOutbox"
group by "status", "kind"
order by "status", "kind";
```

실패 작업의 최근 오류를 확인합니다.

```sql
select
  "id",
  "dedupeKey",
  "kind",
  "attempts",
  "lastError",
  "updated_at"
from "ModerationOutbox"
where "status" = 'FAILED'
order by "updated_at" desc;
```

원인을 해결한 뒤에만 특정 실패 작업을 재시도 상태로 돌립니다.

```sql
update "ModerationOutbox"
set
  "status" = 'PENDING',
  "attempts" = 0,
  "available_at" = now(),
  "lastError" = null
where "id" = :confirmed_job_id
  and "status" = 'FAILED';
```

## 5. 배포 순서

1. 로컬 PostgreSQL 16에서 `npm run test:migration:report-moderation` 실행
2. 전체 unit·type·lint·build 검증
3. Production DB에 migration 적용
4. 애플리케이션 배포
5. 관리자 신고 기각·경고·콘텐츠 삭제 smoke test
6. `ModerationOutbox`의 `PENDING`·`FAILED` 잔존 여부 확인

구버전 애플리케이션은 새 컬럼을 사용하지 않으므로 schema 선적용이 가능합니다. 새 애플리케이션을 먼저 배포하면 생성되지 않은 테이블과 컬럼을 참조하므로 반드시 migration을 먼저 적용합니다.

## 6. 관련 검증

- `features/report/service/admin.test.ts`: 단일 claim과 동일 조치 재시도
- `features/report/service/moderationOutbox.test.ts`: 고유 enqueue, 완료, backoff
- `scripts/test-report-moderation-migration.mjs`: PostgreSQL 동시 claim, rollback, unique/check 제약
- `tests/e2e/admin-report-action.spec.ts`: 관리자 신고 처리 UI 회귀

## 7. 함께 보는 문서

- [신고 처리와 제재 운영 정책](./report-moderation-policy.md)
- [CI/CD 워크플로우](./ci-cd-workflows.md)
- [테스트 전략](./testing-strategy.md)
