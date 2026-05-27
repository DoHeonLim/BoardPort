# BoardPort 테스트 전략

BoardPort의 테스트는 모든 화면 조합을 한 번에 자동화하기보다, 릴리즈 전 QA에서 실제 문제가 발생했거나 회귀 위험이 높은 흐름을 우선 고정합니다.

## 1. 테스트 레벨

### Vitest

빠르게 반복 가능한 순수 로직과 cache 변환은 Vitest로 검증합니다.

- `returnTo` / callback URL 정규화
- 상품/게시글 작성 폼 입력 스키마
- TanStack Query infinite cache의 삭제 항목과 stale cursor 정리
- 알림 타입 설정, Push 허용 여부, quiet hours 정책
- DTO 변환, 상태 전이, fallback 계산 유틸

### Playwright

브라우저와 라우팅 문맥이 필요한 사용자 흐름은 E2E 테스트로 검증합니다.

- 상품/게시글 CRUD와 삭제 후 목록 복귀
- 삭제된 콘텐츠 알림의 이동 가능/불가 상태
- 채팅 약속 수락과 상품 상태 전환
- 로그인/온보딩 기본 smoke flow
- 관리자 신고 처리 smoke flow

## 2. 핵심 검증 축

1. 상품/게시글 CRUD와 삭제 후 목록 cache/cursor 정리
2. 삭제된 콘텐츠를 참조하는 알림 UI
3. 채팅 약속 수락과 상품 예약 상태 전환
4. 로그인, 보호 경로, 온보딩 복귀
5. 관리자 신고 처리와 제재 기록
6. 방송/VOD 접근, 목록/상세 진입, 공유 썸네일 fallback

## 3. 이번 브랜치 범위

- Vitest 설정과 npm script 추가
- `sanitizeCallbackUrl()` 회귀 테스트
- 로그인/회원가입/온보딩/SMS/비밀번호 재설정 폼 스키마 회귀 테스트
- 상품/게시글 폼 스키마 회귀 테스트
- 상품/게시글 infinite cache의 삭제 항목과 stale cursor 보정 테스트
- 채팅 약속 제안/수락 전 상태 가드와 거래 참여자 산정 회귀 테스트
- 알림 타입/Push 정책 테스트
- 알림/상품 이미지 fallback 렌더링 규칙 테스트
- 방송/VOD 접근 플래그, 썸네일 URL, 카드 직렬화 회귀 테스트
- 보드게임 도감 필터 정규화와 목록 URL 생성 회귀 테스트
- 신고 제재 추천 정책, 관리자 차트 집계, 신고/감사 로그 추적 URL 회귀 테스트
- Playwright 의존성과 script 준비
- 로그인 전 메인, 로그인, 오프라인 공개 페이지 smoke 테스트
- 비로그인 보호 경로의 로그인 redirect와 `callbackUrl` 보존 smoke 테스트
- E2E 전용 계정/상품/게시글/알림 seed 스크립트와 실행 기준 문서
- seed 데이터 기반 삭제 콘텐츠 알림 UI 회귀 테스트
- seed 데이터 기반 상품/게시글 목록 노출과 상품 상세 진입 회귀 테스트
- seed 계정 기반 게시글 작성 성공 피드백 회귀 테스트
- seed 계정 기반 게시글 삭제 후 목록 복귀와 App Router mixed tree 잔상 방지 회귀 테스트
- seed 계정 기반 상품 등록 폼 필수 입력 validation 회귀 테스트
- seed 계정 기반 상품 삭제 후 목록 복귀와 삭제 상세 잔상 방지 회귀 테스트
- seed 계정 기반 채팅 목록 노출과 채팅 상세 진입 smoke 테스트
- seed 계정 기반 채팅 약속 수락과 확정 상태 피드백 회귀 테스트
- seed 계정 기반 보드게임 도감 검색 결과 노출과 상세 진입 smoke 테스트
- seed 계정 기반 다시보기 목록 노출과 녹화 상세 진입 smoke 테스트
- seed 계정 기반 알림 설정 화면 렌더링 smoke 테스트
- seed 계정 기반 알림 설정 저장과 재진입 값 유지 회귀 테스트
- seed 관리자 계정 기반 관리자 대시보드/신고 관리 smoke 테스트
- seed 관리자 계정 기반 대기 신고 기각 처리 회귀 테스트
- seed 일반 계정의 관리자 화면 접근 차단 smoke 테스트

로컬에서 Playwright 테스트를 실행할 때는 별도 터미널에서 `npm run dev:e2e`를 먼저 실행한 뒤 `npm run test:e2e`를 실행합니다. 개발 서버 lifecycle은 테스트 러너가 자동으로 관리하지 않고, 테스트 자체는 이미 떠 있는 `http://127.0.0.1:3000`을 대상으로 검증합니다.

`npm run test:e2e`는 실행 전 로컬 서버 연결을 확인합니다. 서버가 켜져 있지 않으면 Playwright 테스트를 시작하기 전에 실행 순서를 안내하고 종료합니다.

DB 상태가 필요한 E2E는 `npm run seed:e2e`로 `[E2E]` prefix 기반 테스트 데이터를 먼저 준비한 뒤 실행합니다.
기본 Playwright 실행에서는 seed 기반 테스트를 skip하고, seed를 실행한 뒤 `E2E_SEEDED=1`을 지정했을 때만 함께 실행합니다.
seed 기반 테스트가 끝난 뒤에는 `npm run cleanup:e2e`로 `[E2E]` prefix 콘텐츠와 테스트 계정 알림을 정리합니다.

```powershell
npm run seed:e2e
$env:E2E_SEEDED="1"
npm run test:e2e -- --project=chromium
Remove-Item Env:E2E_SEEDED
npm run cleanup:e2e
```

## 4. 제외 범위

- 실제 Web Push 전송
- 실제 Cloudflare, Kakao, CoolSMS, Resend 외부 호출
- Cloudflare Direct Upload가 필요한 상품 등록 성공 E2E
- 실제 운영 DB를 사용하는 E2E 시나리오
- 모든 브라우저/기기 조합 검증

DB 상태가 필요한 테스트는 seed/cleanup 스크립트로 준비한 `[E2E]` prefix 데이터만 기준으로 실행합니다. 테스트는 기존 운영 데이터의 존재나 상태를 전제로 하지 않으며, 실행 후 `cleanup:e2e`로 테스트 데이터를 정리합니다.
