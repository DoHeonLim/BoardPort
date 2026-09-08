# E2E 테스트 실행 기준

이 폴더는 Playwright 기반 브라우저 회귀 테스트를 둡니다.

## 실행 순서

### E2E seed 데이터 준비

```bash
npm run seed:e2e
```

### E2E용 서버 실행

별도 터미널에서 실행합니다.

빠른 로컬 반복:

```bash
npm run dev:e2e
```

로컬 Production 모드 검증(선택):

```bash
npm run build
npm run start:e2e
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

특정 spec만 먼저 확인한 뒤 같은 터미널에서 전체 suite를 다시 실행할 때는 중간에 `npm run seed:e2e`를 한 번 더 실행합니다. 약속 수락, 상품 수정, 팔로우처럼 seed 상태를 실제로 변경하는 테스트가 있으므로, Playwright 실행 단위마다 seed 기준 상태를 다시 맞춥니다.

## 데이터 원칙

- E2E 데이터는 제목, 본문, 알림 문구에 `[E2E]` prefix를 사용합니다.
- `npm run cleanup:e2e`는 `[E2E]` prefix 콘텐츠와 E2E 계정 알림을 정리합니다.
- E2E 전용 계정은 로그인 안정성을 위해 재사용합니다.
- `npm run seed:e2e`는 필요한 계정/콘텐츠/알림이 없으면 생성하고, 이미 있으면 재사용합니다.
- 상태 변경 E2E를 여러 번 나누어 실행할 때는 각 Playwright 실행 전에 `npm run seed:e2e`로 상품 상태, 약속 상태, 팔로우 관계를 기준 상태로 복원합니다.
- 운영 DB가 아니라 로컬/테스트 DB를 대상으로 실행합니다.
- seed 기반 테스트는 `E2E_SEEDED=1`이 없으면 skip됩니다.
- GitHub E2E workflow는 seed 전에 `prisma migrate deploy`를 실행해 공유 테스트 DB schema를 현재 코드와 맞춥니다.
- GitHub E2E workflow는 실제 운영 사이트가 아니라 CI 내부에서 `next build` 결과를 `next start`로 실행한 임시 서버를 테스트합니다.
- 서비스 워커 회귀 테스트는 위 CI 환경에서 자동 실행하며, 실제 offline 문서 fallback과 `no-response` 오류 부재를 검증합니다. 개발 서버를 사용하는 로컬 E2E에서는 자동으로 건너뜁니다.
- 기본 CI의 release database smoke는 빈 PostgreSQL에 전체 migration을 적용하고 seed를 두 번 실행해 신규 환경과 반복 실행을 함께 검증합니다.
- 실제 외부 서비스 호출이 필요한 Cloudflare, Kakao, Push, SMS, Email 시나리오는 별도 mock 또는 전용 테스트 환경이 준비된 뒤 확장합니다.
- GitHub E2E는 Production Stream private JWK를 사용하지 않고 실행마다 임시 RSA key를 생성해 signed token 생성 경로만 검증합니다. Seed VOD는 실제 Cloudflare 재생 자산이 아니므로 외부 플레이어 성공 여부는 검증 범위에 포함하지 않습니다.

## 현재 seed 기반 회귀 범위

- 삭제된 콘텐츠를 참조하는 알림의 이동 가능/불가 상태
- 상품/게시글 목록에서 살아 있는 seed 콘텐츠만 노출되는지 여부
- 상품 목록에서 seed 상품 상세로 진입되는지 여부
- 게시글 작성 성공 피드백
- 게시글 삭제 후 `/posts` 목록 복귀와 mixed tree 잔상 방지
- 상품 삭제 후 `/products` 목록 복귀와 삭제 상세 잔상 방지
- 상품 등록 폼의 필수 입력 validation
- 채팅 목록에서 seed 대화 노출과 채팅 상세 진입
- 채팅 약속 수락 후 확정 상태와 상품 예약 상태 유지
- 상품 모달 상세에서 수정 후 기존 목록 문맥 복귀와 변경 내용 반영
- 팔로우 후 팔로워 전용 VOD 잠금 해제, 팔로잉 목록 노출, 상세 접근 수렴
- 보드게임 도감 검색 결과 노출과 상세 진입
- 다시보기 목록에서 seed VOD 노출과 녹화 상세 진입
- 알림 설정 화면의 알림 유형, 방해 금지 시간, 키워드 관리 진입점 렌더링
- 알림 설정 저장 후 재진입 시 알림 종류/방해 금지 시간 유지
- 관리자 대시보드/신고 관리 진입과 일반 계정 관리자 접근 차단
- 관리자 대기 신고 기각 처리와 목록 제거
