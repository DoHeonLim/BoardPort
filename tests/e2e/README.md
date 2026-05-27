# E2E 테스트 실행 기준

이 폴더는 Playwright 기반 브라우저 회귀 테스트를 둡니다.

## 실행 순서

### E2E seed 데이터 준비

```bash
npm run seed:e2e
```

### E2E용 dev server 실행

별도 터미널에서 실행합니다.

```bash
npm run dev:e2e
```

### Playwright 실행

다른 터미널에서 실행합니다.

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

## 현재 seed 기반 회귀 범위

- 삭제된 콘텐츠를 참조하는 알림의 이동 가능/불가 상태
- 상품/게시글 목록에서 살아 있는 seed 콘텐츠만 노출되는지 여부
- 상품 목록에서 seed 상품 상세로 진입되는지 여부
- 게시글 작성 성공 피드백
- 게시글 삭제 후 `/posts` 목록 복귀와 mixed tree 잔상 방지
- 상품 삭제 후 `/products` 목록 복귀와 삭제 상세 잔상 방지
- 상품 등록 폼의 필수 입력 validation
- 채팅 목록에서 seed 대화 노출과 채팅 상세 진입
- 채팅 약속 수락 후 확정 상태와 성공 피드백
- 보드게임 도감 검색 결과 노출과 상세 진입
- 다시보기 목록에서 seed VOD 노출과 녹화 상세 진입
- 알림 설정 화면의 알림 유형, 방해 금지 시간, 키워드 관리 진입점 렌더링
- 알림 설정 저장 후 재진입 시 알림 종류/방해 금지 시간 유지
- 관리자 대시보드/신고 관리 진입과 일반 계정 관리자 접근 차단
- 관리자 대기 신고 기각 처리와 목록 제거
