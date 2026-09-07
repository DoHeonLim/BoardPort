# 권한 / 접근 제어 매트릭스

BoardPort의 접근 제어는 middleware 한 곳에만 의존하지 않고, 페이지 진입, Route Handler, Server Action, service 계층에서 도메인별로 다시 확인합니다.

이 문서는 면접, 코드 리뷰, 릴리즈 전 점검에서 주요 사용자 역할과 보호 지점을 빠르게 확인하기 위한 운영 기준입니다. 세부 구현은 각 도메인의 `actions`, `service`, `route.ts` 파일을 기준으로 확인합니다.

## 1. 기본 원칙

| 원칙                  | 기준                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 세션 우선             | 조회자 또는 행위자 ID는 클라이언트 입력보다 서버 세션을 우선합니다.                                                     |
| 계층별 재검증         | 보호 페이지라도 Server Action과 Route Handler에서 권한을 다시 확인합니다.                                               |
| 소유자 기준           | 수정, 삭제, 상태 변경은 작성자 또는 소유자 권한을 service 계층에서 확인합니다.                                          |
| 관계 기준             | 채팅, 팔로우, 차단, 신고, 방송 접근은 사용자 간 관계와 콘텐츠 상태를 함께 확인합니다.                                   |
| 외부 요청 fail-closed | Webhook처럼 외부에서 들어오는 요청은 production secret 또는 signature 누락 시 상태 변경 전에 거부합니다.                |
| 캐시와 권한 분리      | TanStack Query key는 개인화 결과를 구분하기 위한 cache identity이고, 권한 판단은 서버 세션과 DB 상태를 기준으로 합니다. |

## 2. 페이지 / API 보호 기준

| 영역              | 진입 경로                                                 | 보호 기준                                                                                                            |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 공개 영역         | `/`, `/login`, `/create-account`, 공유 이미지 route       | 비로그인 접근 허용. 인증 사용자는 guest-only 페이지에서 앱 영역으로 이동                                             |
| 앱 영역           | `/products`, `/posts`, `/chat`, `/profile`, `/streams` 등 | middleware에서 로그인 세션 확인 후 비로그인 사용자는 `/login?callbackUrl=...`로 이동                                 |
| 관리자 영역       | `/admin/*`                                                | 관리자 권한 확인. 일반 사용자는 관리자 화면에 남을 수 없음                                                           |
| API Route Handler | `/api/*`                                                  | middleware matcher에서 제외되므로 공개 조회 handler는 입력을 검증하고, 개인화/변경 handler는 세션과 권한을 직접 확인 |
| Server Action     | `features/*/actions/*`                                    | 사용자 의도 기반 변경 작업은 action 내부에서 세션을 읽고 service에 actor ID 전달                                     |
| Webhook           | `/api/webhooks/cloudflare`                                | Cloudflare Stream signature 또는 Destination secret 기준으로 인증. production secret 누락 시 fail-closed             |

## 3. 도메인별 매트릭스

### Product / Marketplace

| 행위                | 허용 대상                          | 대표 가드                                          | 비고                                                                                                              |
| ------------------- | ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 상품 등록           | 로그인 사용자                      | 세션, 사용자 상태, 입력 스키마                     | 지역, 카테고리, 이미지 등 도메인 validation 적용                                                                  |
| 상품 수정/삭제      | 상품 작성자                        | 세션 userId와 product.userId 비교                  | 삭제 시 관련 알림, 리뷰, 채팅 참조 정리                                                                           |
| 좋아요              | 로그인 사용자                      | 세션, 차단 관계, 자기 상품 여부                    | 개인화 캐시는 viewer별 query key로 분리                                                                           |
| 예약/판매 상태 변경 | 상품 작성자                        | 세션, product.userId, 현재 거래 상태 조건          | 예약자/구매자 정보와 관련 약속 상태를 함께 정리                                                                   |
| 상품 목록 조회      | 앱 화면 사용자, 비개인화 직접 요청 | 지역/검색 필터, 서버 세션 기반 viewerId, 차단 관계 | `/products` 화면은 로그인 보호. 직접 API 호출은 서버가 세션 부재 시 `-1` sentinel을 주입한 비개인화 목록으로 처리 |

### Chat / Appointment

| 행위           | 허용 대상                        | 대표 가드                                        | 비고                                                                               |
| -------------- | -------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 채팅방 생성    | 상품 작성자가 아닌 로그인 사용자 | 세션, 상품 존재 여부, 정지 상태, 차단 관계       | 동일 상품/사용자 조합은 기존 방 재사용과 인메모리 lock으로 단일 인스턴스 중복 방어 |
| 채팅방 조회    | 참여자                           | `checkChatRoomAccess`                            | 참여자가 아니면 상세 진입 불가                                                     |
| 메시지 전송    | 참여자                           | 세션, 방 참여 여부, 차단/정지 상태               | 전송 후 Realtime 브로드캐스트                                                      |
| 약속 제안      | 참여자                           | 세션, 방 참여 여부, 약속 시간/장소 validation    | 같은 채팅방의 기존 PENDING 약속 정리                                               |
| 약속 수락/거절 | 수신자                           | 세션, receiverId, 현재 약속 상태, 상품 거래 상태 | 수락 시 약속과 상품 예약 전환을 transaction으로 처리                               |

### Post / Comment / Media

| 행위               | 허용 대상                         | 대표 가드                                 | 비고                                               |
| ------------------ | --------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| 게시글 작성        | 로그인 사용자                     | 세션, 입력 스키마, 첨부 draft 소유자 확인 | 이미지/동영상/임베드 블록 지원                     |
| 게시글 수정/삭제   | 게시글 작성자                     | 세션 userId와 post.userId 비교            | 삭제 후 목록 cache와 stale cursor 정리             |
| 댓글/대댓글 작성   | 로그인 사용자                     | 세션, 게시글 존재 여부, 차단 관계         | 댓글 목록은 차단 관계를 반영                       |
| 댓글 삭제          | 댓글 작성자 또는 정책상 허용 주체 | 세션과 댓글 작성자 확인                   | 상세 권한은 comment service 기준                   |
| 게시글 동영상 연결 | draft 작성자                      | draftKey와 userId 동시 확인               | READY 선도착 시 draftKey를 게시글 저장 전까지 보존 |

### Stream / VOD

| 행위                 | 허용 대상                   | 대표 가드                    | 비고                                                              |
| -------------------- | --------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| 방송 생성/관리       | 로그인 사용자, 방송 소유자  | 세션, liveInput 소유자 확인  | Cloudflare Stream 연동                                            |
| 라이브/VOD 목록 조회 | 로그인 사용자               | Route Handler 내부 세션 ID   | query `viewerId` fallback 제거. 비로그인 직접 호출은 빈 목록 반환 |
| PUBLIC 상세/재생     | 로그인 사용자               | 공용 접근 서비스, 차단 관계, signed playback token | `/streams`는 로그인 보호 페이지                         |
| FOLLOWERS 상세/재생  | 소유자 또는 팔로워          | 공용 접근 서비스, 팔로우 관계, signed playback token | 팔로우 취소 후 요청도 다시 판정                         |
| PRIVATE 상세/재생    | 소유자 또는 unlock된 사용자 | 공용 접근 서비스, private unlock session, signed playback token | 비밀번호 해제 상태는 session 기반으로 확인 |
| VOD 좋아요/댓글      | 접근 가능한 로그인 사용자   | 세션, 부모 방송 공개 범위, 차단 관계 | 조회·쓰기 모두 `authorizeVodAccess`를 재사용             |
| 라이브 채팅 전송     | 접근 가능한 로그인 사용자   | 세션, 현재 방송 접근 판정, mute, rate limit | 전송 직전에 팔로우·unlock 변화를 다시 판정              |

이 문서에서 PUBLIC은 비로그인 인터넷 공개가 아니라, 로그인한 BoardPort 앱 사용자에게 공개되는 범위를 의미합니다.

### Notification / Push

| 행위                        | 허용 대상           | 대표 가드                                      | 비고                                               |
| --------------------------- | ------------------- | ---------------------------------------------- | -------------------------------------------------- |
| 알림 목록 조회              | 본인                | 세션 userId                                    | 삭제된 콘텐츠 알림은 응답 단계에서 link/image 정리 |
| 알림 설정 변경              | 본인                | 세션 userId                                    | In-App 설정과 Push 정책 분리                       |
| Push subscription 등록/삭제 | 본인 브라우저 구독  | 세션, endpoint 전역 소유권, 구독 key proof      | 같은 endpoint의 교차 계정 active 상태를 차단       |
| Push 발송                   | 서버 정책 통과 대상 | 알림 타입 설정, quiet hours, subscription 상태 | In-App 알림과 Web Push는 별도 정책으로 처리        |

### Report / Admin

| 행위             | 허용 대상     | 대표 가드                              | 비고                                         |
| ---------------- | ------------- | -------------------------------------- | -------------------------------------------- |
| 신고 생성        | 로그인 사용자 | 세션, 대상 존재 여부, PENDING 신고 조회 | 같은 사용자가 같은 대상에 제출한 처리 대기 신고를 service에서 확인 |
| 신고 목록/처리   | 관리자        | 관리자 권한, 처리 상태                 | 신고 처리, 콘텐츠 조치, 유저 제재 기록       |
| 감사 로그 조회   | 관리자        | 관리자 권한                            | 처리자, 대상, action, trace URL 기준 추적    |
| 관리자 화면 접근 | 관리자        | middleware 및 서버 측 권한 확인        | 일반 계정의 관리자 화면 접근 차단 E2E로 확인 |

### Webhook / External Event

| 행위                           | 허용 대상                 | 대표 가드                                            | 비고                                           |
| ------------------------------ | ------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Cloudflare Stream webhook      | Cloudflare 서명 요청      | raw body HMAC, timestamp skew, constant-time compare | `CLOUDFLARE_STREAM_WEBHOOK_SECRET` 필요        |
| Cloudflare Destination webhook | secret header가 맞는 요청 | destination secret header 확인                       | `CLOUDFLARE_WEBHOOK_SECRET` 필요               |
| production secret 누락         | 허용하지 않음             | `WEBHOOK_SECRET_NOT_CONFIGURED` 500 반환             | DB 갱신, Realtime 송신, 알림 송신 시작 전 차단 |
| Handshake / empty body         | 상태 변경 없음            | 상태 변경 전 조기 응답                               | Cloudflare 등록 검증 흐름을 유지               |

## 4. 릴리즈 전 확인 포인트

- `/api/*`가 middleware 보호를 받는다고 가정하지 않았는가?
- Route Handler에서 조회자 ID를 query/body 입력으로 신뢰하지 않는가?
- Server Action이 세션 없이 actor ID를 외부 입력으로 받지 않는가?
- 목록, 상세, 좋아요, 잠금 상태처럼 개인화 응답을 만드는 query key에 viewer scope가 포함되어 있는가?
- production webhook secret 누락 시 상태 변경 처리가 시작되지 않는가?
- 관리자 기능은 화면 접근뿐 아니라 action/service 단계에서도 권한을 확인하는가?
- 차단 관계, 정지 사용자, 삭제된 콘텐츠, 나간 채팅 참여자 같은 비정상 상태가 service 계층에서 방어되는가?

## 5. 함께 보는 문서

- [테스트 전략](./testing-strategy.md)
- [Rate Limit / 남용 방지 운영 기준](./rate-limit-policy.md)
- [신고 처리와 제재 운영 정책](./report-moderation-policy.md)
- [보안 헤더 / CSP 운영 정책](./security-headers-csp-policy.md)
- [Cloudflare Stream Signed Playback 전환 절차](./stream-signed-playback-runbook.md)
- [직거래 약속 수락과 상품 상태 원자적 전환](../troubleshooting/troubleshooting-appointment-atomic-transition.md)
- [게시글 동영상 Cloudflare 웹훅 상태 전환](../troubleshooting/troubleshooting-post-video-cloudflare-webhook.md)
