# BoardPort Release Runbook

이 문서는 `develop`에서 검증한 BoardPort 변경을 `master`와 Vercel Production으로 배포할 때 사용하는 최종 절차입니다. 자동 테스트 통과만으로 릴리즈를 완료로 판단하지 않고, DB·Supabase·Cloudflare처럼 Git rollback만으로 복구되지 않는 외부 상태를 함께 확인합니다.

## 1. 배포 전 조건

- 작업 브랜치가 최신 `develop` 기준이며 의도하지 않은 파일이 없습니다.
- GitHub의 `Full Migration and Seed Smoke`, `Dependency and Secret Audit`, `Unit, Type, Lint, Build`, `Playwright Chromium`이 모두 통과했습니다.
- Vercel Preview build가 성공했습니다.
- migration이 있다면 빈 PostgreSQL 전체 적용과 schema drift 검사가 통과했습니다.
- `.env`, private JWK, API token, DB URL과 사용자 데이터가 commit·PR·로그에 포함되지 않았습니다.

```bash
git status --short
git diff --check
```

## 2. 환경변수 경계

`.env.example`을 기준으로 Vercel Production과 Preview의 변수 이름을 대조합니다. 값 자체는 PR이나 작업 기록에 복사하지 않습니다.

특히 아래 서버 전용 값은 Sensitive로 유지합니다.

- `COOKIE_PASSWORD`, `RATE_LIMIT_SALT`, `CRON_SECRET`
- `DATABASE_URL`, `DIRECT_URL`
- `SUPABASE_SECRET_KEY`, `SUPABASE_REALTIME_SIGNING_KEY_JWK`
- `CLOUDFLARE_API_TOKEN`, webhook secrets, Stream signing private JWK
- OAuth client secrets, SMS·메일 API secrets, VAPID private key

`NEXT_PUBLIC_` 접두사가 있는 값은 브라우저 번들에 노출될 수 있으므로 private key나 secret을 넣지 않습니다. DB 연결과 Pool 설정은 [`database-deployment-runbook.md`](./database-deployment-runbook.md)를 따릅니다.

## 3. DB migration이 있는 릴리즈

1. 빈 DB release smoke와 schema drift 검사를 통과합니다.
2. migration이 배포 전 production 코드와 호환되는지 확인합니다.
3. 운영 DB host·database·schema를 `npx prisma migrate status` 출력으로 확인합니다.
4. `npx prisma migrate deploy`를 실행합니다.
5. `npx prisma migrate status`가 최신 상태인지 확인합니다.
6. 그다음 master 병합과 Vercel Production 배포를 진행합니다.

운영 migration 명령, expand/contract 원칙과 실패 시 `migrate resolve` 판단 기준은 DB Runbook을 사용합니다. migration 폴더를 적용 후 수정하거나 Git rollback만으로 DB가 되돌아간다고 가정하지 않습니다.

## 4. 외부 서비스 확인

### Supabase

- publishable key와 서버 secret key의 용도가 분리되어 있습니다.
- Realtime signing key의 `kid`가 현재 Supabase JWT signing key와 일치합니다.
- private channel RLS 정책이 존재하며 public channel access가 비활성화되어 있습니다.
- 본인·참여자·팔로워·PRIVATE 해제 사용자만 해당 topic을 구독할 수 있습니다.

세부 적용·복구는 [`supabase-realtime-private-channels.md`](./supabase-realtime-private-channels.md)를 따릅니다.

### Cloudflare

- 기존 Live Input과 VOD에 `requireSignedURLs=true`가 유지됩니다.
- 원본 UID 재생은 거부되고 권한 확인 후 발급한 단기 token만 재생됩니다.
- webhook secret, Stream signing key ID와 private JWK가 Production 배포에 등록되어 있습니다.
- webhook inbox/outbox에 장시간 `PROCESSING` 또는 반복 `FAILED` 상태가 쌓이지 않습니다.

세부 적용·복구는 [`stream-signed-playback-runbook.md`](./stream-signed-playback-runbook.md)와 [`stream-webhook-idempotency.md`](./stream-webhook-idempotency.md)를 따릅니다.

## 5. Production smoke 순서

운영 데이터를 파괴하지 않는 전용 테스트 계정과 자산을 사용합니다.

1. 로그인·로그아웃, 보호 경로 redirect와 기존 세션 폐기를 확인합니다.
2. A 계정 로그아웃 후 B 계정 로그인 시 Push 구독과 개인화 Query cache가 섞이지 않는지 확인합니다.
3. 상품·게시글 작성, 상세, 수정, 목록 복귀와 삭제 후 잔상 제거를 확인합니다.
4. 채팅방 생성·메시지 재전송·약속 수락에서 중복 row나 잘못된 거래 상태가 생기지 않는지 확인합니다.
5. 알림 수신·설정 저장과 삭제 콘텐츠 알림 fallback을 확인합니다.
6. PUBLIC·FOLLOWERS·PRIVATE 방송/VOD의 허용·거부와 signed playback을 확인합니다.
7. Realtime 알림·상품 채팅·방송 채팅의 private 구독과 재연결 후 DB 상태 수렴을 확인합니다.
8. 관리자 신고 기각·처리 재시도에서 제재·감사 로그·알림이 중복되지 않는지 확인합니다.
9. 사용자 이미지 업로드·연결·삭제에서 다른 사용자 자산 접근이 거부되는지 확인합니다.
10. 오프라인 fallback, 서비스 워커 업데이트, Push와 주요 모바일 키보드 흐름을 확인합니다.

관련 자동화 범위는 [`testing-strategy.md`](./testing-strategy.md), 권한 기대값은 [`access-control-matrix.md`](./access-control-matrix.md)를 기준으로 판단합니다.

## 6. 모니터링

배포 직후 Vercel Functions와 외부 서비스 로그에서 다음 신호를 확인합니다.

- 인증·환경변수 오류의 5xx 증가
- PostgreSQL connection timeout, `too many clients`, transaction 오류
- Realtime token 401·403과 private join 거절 증가
- Cloudflare webhook 검증 실패와 outbox 반복 실패
- 이미지·signed playback API 오류 증가
- Cron 인증 실패 또는 outbox 처리 중단

오류가 없어도 핵심 smoke를 직접 통과하기 전에는 릴리즈를 완료로 기록하지 않습니다.

## 7. Rollback 기준

| 장애 범위              | 우선 조치                                                        | 금지 사항                                       |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| 애플리케이션 코드·UI   | 직전 정상 Vercel deployment로 rollback                           | DB 구조가 호환되는지 확인 없이 rollback         |
| additive DB migration  | 새 schema와 호환되는 이전 앱 배포 사용, 후속 보정 migration 준비 | 적용된 migration 파일 수정·삭제                 |
| migration 중간 실패    | 실제 적용 SQL과 `_prisma_migrations` 확인 후 복구 판단           | 원인 확인 없는 `migrate resolve` 실행           |
| Realtime private 인증  | signing key·secret·RLS·topic을 함께 확인                         | public access만 켜고 완료 처리                  |
| Stream signed playback | 배포·key ID·JWK·token 시각과 원격 자산 설정 확인                 | 원본 UID fallback 추가 또는 서명 요구 즉시 해제 |
| webhook·outbox         | 실패 원인 수정 후 동일 dedupe key로 재처리                       | inbox/outbox row 임의 삭제로 증거 제거          |

DB나 외부 보안 정책을 되돌리는 조치는 Git rollback보다 영향 범위가 크므로, 대상·이유·검증·재적용 계획을 먼저 기록합니다.

## 8. 완료 기록

릴리즈 기록에는 다음만 남기고 secret과 전체 사용자 데이터는 남기지 않습니다.

- commit SHA와 배포 시각
- CI/E2E/Vercel 결과
- 적용된 migration 이름과 최종 status
- 외부 설정의 항목별 성공 여부와 대상 개수
- Production smoke 결과
- 발견한 오류, rollback 여부와 후속 작업
