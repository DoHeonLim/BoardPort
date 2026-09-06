# Database 연결·배포 Runbook

BoardPort는 Vercel 애플리케이션 런타임과 Prisma CLI가 서로 다른 PostgreSQL 연결 경계를 사용합니다. 이 문서는 연결 풀 설정, migration 배포 순서와 실패 복구 기준을 정리합니다.

## 1. 연결 경계

| 용도                       | 환경변수                              | 권장 연결                                    |
| -------------------------- | ------------------------------------- | -------------------------------------------- |
| Next.js·Vercel 런타임      | `DATABASE_URL`                        | Supabase transaction pooler, 일반적으로 6543 |
| Prisma migration·상태 확인 | `DIRECT_URL`                          | direct 또는 session pooler, 일반적으로 5432  |
| 빈 DB release smoke        | `RELEASE_MIGRATION_TEST_DATABASE_URL` | 로컬 PostgreSQL 전용 DB                      |

`prisma.config.ts`는 migration과 Prisma CLI에 `DIRECT_URL`만 사용합니다. 애플리케이션의 `PrismaPg` 어댑터는 `DATABASE_URL`과 아래 node-postgres Pool 옵션을 사용합니다.

- `DATABASE_POOL_MAX`: Vercel 인스턴스별 최대 연결 수, 기본값 `5`
- `DATABASE_CONNECTION_TIMEOUT_MS`: 연결 획득 제한 시간, 기본값 `10000`
- `DATABASE_IDLE_TIMEOUT_MS`: 유휴 연결 정리 시간, 기본값 `10000`

Prisma URL의 `connection_limit`은 `@prisma/adapter-pg`가 생성하는 `pg.Pool`의 `max` 옵션이 아닙니다. BoardPort는 URL 파라미터에 기대지 않고 위 환경변수를 정수로 검증해 Pool에 직접 전달합니다. 기본값 5는 관리자 대시보드와 App Router의 병렬 조회를 수용하면서 기존 node-postgres 암묵적 기본값 10보다 인스턴스별 연결 상한을 낮춘 값입니다. 트래픽과 DB 연결 한도를 측정하기 전에는 이를 임의로 늘리지 않습니다.

## 2. 로컬 Docker migration 통합 테스트

로컬에 별도 PostgreSQL을 상시 실행하지 않고 일회용 PostgreSQL 16 컨테이너에서 전체 도메인 migration 통합 테스트를 실행합니다.

```bash
npm run test:migration:docker
```

이 명령은 다음 작업을 자동으로 수행합니다.

1. `boardport_migration_test` 전용 DB를 가진 PostgreSQL 16 컨테이너 생성
2. `pg_isready` 성공까지 최대 30초 대기
3. 전체 `test:migration` 실행과 전용 로컬 DB URL 주입
4. 성공·실패 여부와 무관하게 컨테이너 종료 및 `--rm` 삭제

특정 도메인 migration만 다시 확인할 때는 같은 명령 뒤에 target을 전달합니다.

```bash
npm run test:migration:docker -- product-trade
```

지원 target은 `push`, `realtime`, `media`, `auth-session`, `report-moderation`, `chat-idempotency`, `product-trade`, `stream-webhook`, `vod-pagination`입니다. target을 생략하면 전체 테스트를 순차 실행합니다. 대상 정의는 일반 실행기와 Docker 실행기가 공유하므로 한쪽에서 누락되지 않습니다.

자동 실행은 `127.0.0.1:55432` 포트를 사용합니다. 포트가 이미 사용 중이면 기존 프로세스나 테스트 컨테이너를 종료한 뒤 다시 실행합니다. 비정상 종료로 컨테이너가 남았는지는 다음 명령으로 확인할 수 있습니다.

```bash
docker ps -a --filter "name=boardport-migration-test"
```

스크립트와 개별 migration 테스트는 운영 DB 오지정을 막기 위해 localhost의 `boardport_migration_test`만 허용합니다. 테스트 과정에서 테이블을 재구성하므로 운영·개발 DB URL을 직접 주입하지 않습니다.

## 3. 배포 전 검증

빈 PostgreSQL에서 전체 migration과 최종 schema 정합성을 먼저 검증합니다.

```bash
RELEASE_MIGRATION_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/boardport_release_test?schema=public" \
npx prisma migrate deploy --config prisma.release-migration-test.config.ts

RELEASE_MIGRATION_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/boardport_release_test?schema=public" \
npx prisma migrate diff \
  --config prisma.release-migration-test.config.ts \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --exit-code
```

`No difference detected.`가 아닌 경우 운영 DB에 적용하지 않습니다. GitHub의 `Full Migration and Seed Smoke`도 같은 검증을 수행합니다.

## 4. 운영 migration 순서

Vercel Git 배포와 GitHub Actions는 독립적으로 시작되므로 CI에서 운영 DB를 자동 변경하지 않습니다. migration이 포함된 릴리즈는 다음 순서를 사용합니다.

1. 변경 브랜치에서 빈 DB release smoke와 전체 CI를 통과시킵니다.
2. migration이 현재 production 코드와 호환되는 additive 변경인지 확인합니다.
3. 운영 `DIRECT_URL` 대상이 맞는지 `npx prisma migrate status` 출력의 host·database·schema로 확인합니다.
4. `npx prisma migrate deploy`를 실행합니다.
5. 다시 `npx prisma migrate status`를 실행해 최신 상태를 확인합니다.
6. 이후 master 병합과 Vercel production 배포를 진행합니다.
7. 배포 후 핵심 API와 해당 migration의 도메인 smoke test를 수행합니다.

컬럼 삭제·이름 변경·타입 축소처럼 구버전 코드와 호환되지 않는 변경은 한 번에 배포하지 않습니다. 먼저 새·구 코드가 함께 사용할 수 있는 구조를 추가하고 데이터를 전환한 뒤, 다음 릴리즈에서 이전 구조를 제거하는 expand/contract 순서를 사용합니다.

## 5. 실패 복구

- `migrate deploy` 실패 시 같은 명령을 반복하기 전에 migration SQL과 `_prisma_migrations` 상태를 확인합니다.
- transaction 안에서 완전히 rollback된 migration만 원인을 수정한 뒤 `prisma migrate resolve --rolled-back <migration>` 사용을 검토합니다.
- SQL을 수동으로 완료한 경우에만 실제 DB 구조를 검증한 뒤 `--applied`를 사용합니다.
- 적용된 migration 폴더를 수정하거나 삭제하지 않습니다. 보정은 새 migration으로 추가합니다.
- 이미 적용된 컬럼·데이터를 파괴적으로 되돌리지 않습니다. 애플리케이션 rollback이 새 schema와 호환되도록 migration을 additive하게 설계합니다.

`migrate resolve`는 일반 배포 명령이 아닙니다. 실패 원인과 DB의 실제 적용 범위를 확인하지 않은 상태에서는 실행하지 않습니다.

## 6. 배포 후 확인

```bash
npx prisma migrate status
npm run test
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Vercel Functions 로그에서 연결 timeout, `too many clients`, transaction pooler prepared statement 오류가 없는지 확인합니다. 문제가 있으면 먼저 `DATABASE_URL`의 pooler 종류와 `DATABASE_POOL_MAX`를 확인하고, DB 연결 한도를 확인하지 않은 채 Pool 크기만 늘리지 않습니다.

## 7. 참고

- [Supabase PostgreSQL 연결 방식](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [node-postgres Pool API](https://node-postgres.com/apis/pool)
