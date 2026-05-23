# CSP Report-Only / 보안 헤더 콘솔 로그 트러블슈팅

## 문제 요약

BoardPort는 보안 헤더를 `next.config.mjs`에서 전역 적용하고, CSP는 Enforced `Content-Security-Policy`가 아니라 `Content-Security-Policy-Report-Only`로 관찰합니다.

따라서 운영 사이트 콘솔에 CSP 위반 로그가 보여도 곧바로 기능 차단이나 릴리즈 차단으로 판단하지 않습니다.

콘솔, Network 탭, Lighthouse에서 보안 헤더 관련 경고를 봤을 때 어떤 로그를 실제 문제로 보고, 어떤 로그를 관찰 대상으로 둘지 나누기 위해 정리했습니다.

현재 정책의 전체 배경과 허용/제외 출처는 [security-headers-csp-policy.md](../operations/security-headers-csp-policy.md)에 따로 정리했습니다.

## 1. 먼저 확인할 것

### 1.1 응답 헤더 확인

브라우저 DevTools Network 탭에서 document 요청을 선택하고 아래 헤더를 확인합니다.

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `Content-Security-Policy-Report-Only`
- `Permissions-Policy`

Vercel custom domain 운영 환경에서는 HSTS를 앱 코드가 아니라 Vercel 플랫폼 계층에서 관리합니다.

- 기대값: `Strict-Transport-Security: max-age=63072000`
- 앱 코드에서 별도 HSTS를 중복으로 내려주지 않는 것이 현재 기준입니다.

### 1.2 Enforced CSP 여부 확인

현재 BoardPort의 운영 기준은 Enforced CSP가 아닙니다.

- 있어야 함: `Content-Security-Policy-Report-Only`
- 없어야 함: Enforced `Content-Security-Policy`

`Report-Only` 로그는 브라우저가 위반을 기록만 하고 리소스를 차단하지 않는 관찰 신호입니다.

## 2. 자주 보이는 로그 판단

### 2.1 Kakao Maps `unsafe-eval`

예:

```text
Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script
```

판단:

- 기능이 정상 동작한다면 릴리즈 차단 이슈로 보지 않습니다.
- `Report-Only` 로그만 발생하고 실제 지도 기능이 차단되지 않는지 확인합니다.
- 로그 제거만을 목적으로 `script-src 'unsafe-eval'`을 허용하지 않습니다.

이렇게 본 이유:

- Kakao Maps SDK 내부에서 `unsafe-eval` 위반이 관찰됩니다.
- `unsafe-eval` 허용은 보안 강도를 크게 낮추므로 현재 정책에서는 허용하지 않습니다.
- Kakao Maps를 유지하는 한 Enforced `script-src` 전환의 주요 blocker로 분류합니다.

### 2.2 Vercel Live Feedback

예상 출처:

- `https://vercel.live`

판단:

- 앱 필수 런타임 출처가 아니므로 기본 allowlist에 추가하지 않습니다.
- Vercel Live Feedback을 운영 기능으로 사용할 때만 별도 허용을 검토합니다.
- `Report-Only` 로그만 있고 앱 기능 차단이 없다면 릴리즈 차단 이슈로 보지 않습니다.

### 2.3 Workbox 경유 이미지/썸네일 `connect-src`

Workbox 서비스워커가 이미지 리소스를 `fetch` 경로로 처리하면서, 이미지 출처가 `img-src`뿐 아니라 `connect-src`에서도 관찰되는 케이스를 확인했습니다.

현재 앱 필수 출처로 반영된 예:

- `https://imagedelivery.net`
- `https://upload.imagedelivery.net`
- `https://upload.cloudflarestream.com`
- `https://i.ytimg.com`
- `https://mts.daumcdn.net`
- `https://t1.daumcdn.net`

판단 순서:

1. 해당 출처가 실제 앱 기능에 필요한지 확인합니다.
2. 이미지 표시, direct upload, 지도 타일, YouTube 썸네일처럼 필수 기능이면 정책 문서의 출처 목록과 비교합니다.
3. 이미 정책에 반영된 출처인데도 로그가 재현되면 실제 응답 헤더가 최신 배포인지 확인합니다.
4. 브라우저 확장 프로그램이나 오래된 서비스워커 영향인지 분리합니다.

### 2.4 YouTube 통계/추적 요청 차단

예상 요청:

- `youtube-nocookie.com/youtubei/v1/log_event`
- `/api/stats/qoe`
- `/api/stats/atr`

판단:

- iframe 재생이 정상이라면 릴리즈 차단 이슈로 보지 않습니다.
- 통계/추적성 요청 출처는 기본 allowlist에 추가하지 않습니다.
- `net::ERR_BLOCKED_BY_CLIENT`는 브라우저 확장 프로그램 영향일 수 있으므로 CSP 회귀와 분리합니다.

### 2.5 Cloudflare Stream player 내부 로그

예상 로그:

- `EmeEncryptionSchemePolyfill`
- `McEncryptionSchemePolyfill`
- player 내부 thumbnail preview `400 Bad Request`
- 브라우저 Tracking Prevention storage 접근 제한

판단:

- Cloudflare Stream iframe 재생과 녹화 재생이 정상이라면 CSP 회귀로 보지 않습니다.
- player 내부 감지 로그와 브라우저 추적 방지 로그는 기능 차단 여부와 분리해 판단합니다.

## 3. 릴리즈 차단 기준

아래는 릴리즈 전 수정 또는 명시적 보류 판단이 필요한 경우입니다.

- Enforced `Content-Security-Policy`가 의도치 않게 내려가고 주요 기능이 차단됨
- `Content-Security-Policy-Report-Only`가 누락됨
- `X-Frame-Options`, `COOP`, `Referrer-Policy`, `Permissions-Policy` 등 핵심 헤더가 누락됨
- Kakao Maps, Supabase Realtime, Cloudflare Stream, YouTube embed, PWA/Web Push, Cloudflare upload 중 실제 기능 실패가 재현됨
- 최신 서비스워커에서도 주요 route의 document 요청이 반복적으로 network error로 반환됨
- 이미지/영상 업로드가 CSP 또는 connect-src 문제로 실제 실패함

## 4. 릴리즈 비차단 기준

아래는 기능이 정상이라는 전제에서 관찰 로그로 분류합니다.

- Kakao Maps SDK의 `unsafe-eval` Report-Only 로그
- Vercel Live Feedback 관련 Report-Only 로그
- YouTube player 내부 통계/추적 요청 차단
- Cloudflare player 내부 polyfill 또는 thumbnail preview 로그
- Edge/Chrome Tracking Prevention 관련 cross-site storage 로그
- 오래된 서비스워커 unregister 후 사라지는 fetch error

## 5. 확인 절차

1. Network 탭에서 실제 document 요청 status와 응답 헤더를 확인합니다.
2. Console 로그가 `Report-Only`인지 Enforced 차단인지 구분합니다.
3. 문제가 된 출처가 앱 필수 기능인지 정책 문서와 비교합니다.
4. 해당 기능을 직접 수행해 실제 차단 여부를 확인합니다.
5. PWA 관련이면 Application 탭에서 현재 서비스워커가 최신인지 확인합니다.
6. unregister 후 사라지는 문제는 기존 서비스워커/cache 잔존 이슈로 분리합니다.
7. 최신 배포와 최신 서비스워커에서도 재현되면 릴리즈 차단 후보로 올립니다.

## 6. 관련 문서

- [보안 헤더 / CSP 운영 정책](../operations/security-headers-csp-policy.md)
