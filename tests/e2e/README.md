# E2E 테스트 실행 기준

이 폴더는 Playwright 기반 브라우저 회귀 테스트를 둡니다.

## 실행 순서

1. E2E seed 데이터 준비

```bash
npm run seed:e2e
```

2. 별도 터미널에서 E2E용 dev server 실행

```bash
npm run dev:e2e
```

3. 다른 터미널에서 Playwright 실행

```bash
npm run test:e2e -- --project=chromium
```

seed 데이터가 필요한 테스트까지 실행할 때는 `E2E_SEEDED=1`을 함께 지정합니다.

```powershell
$env:E2E_SEEDED="1"
npm run test:e2e -- --project=chromium
Remove-Item Env:E2E_SEEDED
```

seed 기반 테스트까지 실행한 뒤에는 E2E 데이터가 데모 화면에 남지 않도록 cleanup을 실행합니다.

```powershell
npm run cleanup:e2e
```

전체 실행 예시는 아래 순서를 기준으로 합니다.

```powershell
npm run seed:e2e
$env:E2E_SEEDED="1"
npm run test:e2e -- --project=chromium
Remove-Item Env:E2E_SEEDED
npm run cleanup:e2e
```

## 데이터 원칙

- E2E 데이터는 제목, 본문, 알림 문구에 `[E2E]` prefix를 사용합니다.
- `npm run cleanup:e2e`는 `[E2E]` prefix 콘텐츠와 E2E 계정 알림을 정리합니다.
- E2E 전용 계정은 로그인 안정성을 위해 재사용합니다.
- `npm run seed:e2e`는 필요한 계정/콘텐츠/알림이 없으면 생성하고, 이미 있으면 재사용합니다.
- 운영 DB가 아니라 로컬/테스트 DB를 대상으로 실행합니다.
- seed 기반 테스트는 `E2E_SEEDED=1`이 없으면 skip됩니다.
- 실제 외부 서비스 호출이 필요한 Cloudflare, Kakao, Push, SMS, Email 시나리오는 별도 mock 또는 전용 테스트 환경이 준비된 뒤 확장합니다.
