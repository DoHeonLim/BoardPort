# 보안 헤더 / CSP 운영 정책

BoardPort는 Lighthouse Trust & Safety 항목을 참고하되, 외부 SDK와 PWA 기능 회귀 위험을 함께 고려해 보안 헤더를 단계적으로 운영합니다.

## 1. 적용 헤더

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Permissions-Policy`
- `Content-Security-Policy-Report-Only`

## 2. CSP 운영 기준

현재 CSP는 Enforced가 아니라 Report-Only 기준으로 운영합니다.

이렇게 둔 이유:

- Kakao Maps, Cloudflare Stream, YouTube, Workbox 등 외부 런타임이 많음
- Enforced 전환 시 지도/영상/푸시/임베드 기능 회귀 위험이 있음
- 먼저 Report-Only 로그로 실제 출처를 관찰하고, 기능 차단 가능성을 줄이는 방향이 안전함

## 3. 주요 허용 출처

- 이미지: Cloudflare Images, Supabase Storage, Kakao/Daum 지도 리소스
- 스크립트: `'self'`, Kakao Maps/Daum SDK
- 연결: Supabase, Cloudflare Stream, Kakao Local, 필요한 Vercel 런타임 출처
- 미디어/프레임: Cloudflare Stream, YouTube embed

## 4. 의도적으로 보류한 항목

### Kakao Maps `unsafe-eval`

Kakao Maps SDK 내부 동작으로 Report-Only 로그가 발생하는 것을 확인했습니다. 기능 차단은 아니므로 릴리즈 차단 항목으로 보지 않습니다.
다만 로그 제거만을 목적으로 `script-src 'unsafe-eval'`을 허용하지는 않습니다.

### Trusted Types

서드파티 SDK와 기존 UI 흐름에 영향이 있을 수 있어 별도 검증 전 Enforced 적용을 보류합니다.

### COEP/CORP

지도, 영상, 이미지, 임베드 리소스와 충돌 가능성이 있어 현재 범위에서는 적용하지 않습니다.

## 5. 릴리즈 판단 기준

릴리즈 차단:

- 실제 기능이 CSP에 의해 막힘
- `object-src`, `frame-ancestors 'self'`, 인증 경로 관련 보안 헤더가 의도와 다름
- 운영자가 재현 가능한 보안 경고가 발생

릴리즈 비차단:

- Report-Only 로그만 남고 기능 차단 없음
- 외부 SDK 내부 구현에서 발생하는 알려진 경고
- 오래된 Service Worker 잔여 상태에서만 재현되는 경고

## 6. Enforced 전환 조건

CSP Enforced 전환은 Report-Only 로그를 일정 기간 관찰한 뒤 단계적으로 검토합니다.

- 핵심 사용자 흐름에서 CSP로 인한 기능 차단이 없어야 함
- 지도, 영상, 이미지 업로드, Web Push, 소셜 미리보기 QA가 통과해야 함
- `script-src`에서 불필요한 출처와 위험한 예외를 줄일 수 있어야 함
- Preview 환경에서 제한 적용 후 운영 환경 반영 여부를 결정

## 7. 관련 문서

- [Lighthouse 보안 헤더 점검](../troubleshooting/troubleshooting-lighthouse-security-headers.md)
