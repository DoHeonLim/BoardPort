# CI/CD Workflows

BoardPort의 전체 CI/CD 흐름은 GitHub Actions CI와 Vercel CD로 나뉩니다. GitHub Actions는 배포 전 코드 품질과 회귀 테스트를 확인하고, Vercel은 Git 연동을 기준으로 preview 또는 production 배포를 자동 수행합니다.

브랜치 역할:

- `develop`: 통합 및 릴리즈 준비 브랜치
- `master`: 최종 릴리즈 브랜치이자 Vercel production branch

## 1. 기본 CI

`.github/workflows/ci.yml`은 `develop`/`master` 대상 PR과 `develop`/`master` push에서 실행합니다.

검증 항목:

- 빈 PostgreSQL에서 전체 `prisma migrate deploy` → E2E seed 2회 → cleanup
- 적용된 빈 DB와 `schema.prisma` 사이 migration drift 검사
- 전체 Git 이력 Gitleaks secret scan
- `npm run audit:production` critical 취약점 차단
- `npm run test:coverage`
- `npm run test:migration:push`
- `npm run test:migration:realtime`
- `npm run test:migration:media`
- `npm run test:migration:auth-session`
- `npm run test:migration:report-moderation`
- `npm run test:migration:chat-idempotency`
- `npm run test:migration:product-trade`
- `npm run test:migration:stream-webhook`
- `npm run test:migration:vod-pagination`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

`Full Migration and Seed Smoke` job은 전용 `RELEASE_MIGRATION_TEST_DATABASE_URL`만 읽는 Prisma config로 빈 `boardport_release_test` DB에 전체 migration 이력을 처음부터 적용합니다. 적용된 DB와 `schema.prisma`를 비교해 drift가 있으면 차단하고, E2E seed를 두 번 실행해 최종 schema와 seed 멱등성을 확인한 뒤 cleanup을 검증합니다. 도메인별 Migration 통합 테스트는 별도 `boardport_migration_test` DB에서 순차 실행합니다. 기본 CI는 외부 서비스 호출 없이 컴파일과 정적 검증을 수행하기 위해 placeholder 환경 변수를 사용합니다.

`Dependency and Secret Audit` job은 전체 Git 이력을 Gitleaks로 검사하고 production dependency audit을 실행합니다. 이 job은 의존성 트리만 검사하므로 `npm ci --ignore-scripts`를 사용해 Prisma Client 생성과 애플리케이션 DB 환경 변수 의존성을 제외합니다. 현재 Prisma CLI 경로의 알려진 high 3건은 [`dependency-security-upgrade.md`](./dependency-security-upgrade.md)에 추적하며, 자동 수정이 Prisma 6.12 강제 다운그레이드를 제안하므로 적용하지 않습니다. CI는 이 기준선을 숨기지 않으면서 critical 취약점이 새로 유입되면 실패하도록 설정합니다.

`Unit, Type, Lint, Build` job은 Node 기반 단위 테스트와 파일별 jsdom 컴포넌트 테스트를 함께 실행하고 전체 source V8 coverage가 [`testing-strategy.md`](./testing-strategy.md)의 기준선 아래로 내려가면 실패합니다.

## 2. Playwright E2E

`.github/workflows/e2e.yml`은 `develop`/`master` 대상 PR과 수동 실행에서 Playwright Chromium E2E를 실행합니다.

실행 순서:

- 의존성 설치
- 공유 테스트 DB migration 적용
- Playwright Linux 의존성 설치
- Playwright Chromium 설치
- `npm run build`로 production 산출물 생성
- `npm run start:e2e`로 production 서버 실행
- `npm run seed:e2e`
- `E2E_SEEDED=1 npm run test:e2e -- --project=chromium`
- `npm run cleanup:e2e`

E2E는 공유 테스트 DB를 사용하므로 workflow concurrency를 `e2e-shared-db`로 고정해 동시에 여러 E2E가 seed/cleanup을 수행하지 않도록 제한합니다. CI에서는 개발 서버가 허용하는 동작에 기대지 않도록 `next build` 결과를 `next start`로 실행해 실제 배포 모드와 같은 경계를 검증합니다. Production 모드 로그인에서 요구하는 `RATE_LIMIT_SALT`는 GitHub 실행 ID와 재시도 번호를 조합한 테스트 전용 값으로 매 실행마다 주입합니다.

## 3. E2E Secrets

GitHub Actions에서 E2E를 실행하려면 아래 secrets를 설정합니다.

| Secret                                     | 설명                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `E2E_DATABASE_URL`                         | E2E 앱 런타임용 DB 연결 문자열                                                |
| `E2E_DIRECT_URL`                           | E2E seed/cleanup용 직접 DB 연결 문자열                                        |
| `E2E_COOKIE_PASSWORD`                      | iron-session 쿠키 암호화 키                                                   |
| `E2E_NEXT_PUBLIC_SUPABASE_URL`             | E2E Supabase URL                                                              |
| `E2E_NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`      | E2E Supabase publishable key                                                  |
| `E2E_SUPABASE_SECRET_KEY`                  | private Broadcast 서버 발신용 E2E Supabase secret key                         |
| `E2E_SUPABASE_REALTIME_SIGNING_KEY_JWK`    | BoardPort Realtime 단기 JWT 서명용 E2E Supabase ES256 private JWK의 base64 값 |
| `E2E_NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH`  | E2E 이미지 delivery hash                                                      |
| `E2E_NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN` | E2E Stream/VOD 재생 도메인                                                    |

## 4. CD

Vercel은 GitHub branch/PR 이벤트를 받아 preview 또는 production 배포를 수행합니다. `master`가 production branch이므로 `master`로 merge 또는 push된 변경은 Vercel production deployment 대상입니다.

GitHub Actions에서 별도 deploy job을 두지 않는 이유:

- Vercel Git 연동이 이미 배포 lifecycle을 관리
- 배포 토큰과 프로젝트 ID를 GitHub Actions에 중복 보관하지 않아도 됨
- CI 실패 시 PR에서 병합을 보류하고, 병합 후 Vercel 배포는 기존 흐름을 유지

`master` production 배포를 CI 통과 후에만 허용하려면 GitHub branch protection 또는 ruleset에서 필수 check를 설정합니다. 기본 권장 check:

- `Full Migration and Seed Smoke`
- `Dependency and Secret Audit`
- `Unit, Type, Lint, Build`
- `Playwright Chromium`

Vercel Deployment Checks까지 사용해 production promotion을 제어할 경우, Vercel이 확인하는 commit SHA에 필요한 GitHub check가 실제로 생성되는지 함께 확인합니다.

운영 배포 검증은 Vercel 배포 결과와 production smoke QA를 기준으로 확인합니다.
