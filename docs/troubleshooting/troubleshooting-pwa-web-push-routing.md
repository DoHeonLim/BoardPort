# PWA Web Push 중복 제어와 알림 라우팅 트러블슈팅

## 문제 요약

BoardPort의 알림은 단순히 "푸시를 보낸다"로 끝나지 않았습니다.

- 사용자가 이미 같은 채팅방을 보고 있을 때도 토스트와 푸시가 겹쳐 보였고
- 같은 채팅방 또는 같은 방송에 대한 브라우저 푸시가 반복해서 쌓였으며
- 브라우저가 열려 있을 때와 닫혀 있을 때의 처리 경로도 달랐습니다.

즉, 같은 이벤트라도 **In-App 알림**, **브라우저 푸시**, **탭 포커싱**, **중복 억제**를 함께 설계해야 했습니다.

## 1. 증상

### 1.1 같은 도메인의 알림이 반복적으로 쌓임

- 같은 채팅방의 새 메시지
- 같은 방송의 시작 알림
- 같은 상품의 거래 상태 변경

이 반복되면 사용자는 OS/브라우저 알림 트레이에서 동일한 맥락의 푸시를 여러 번 보게 됩니다.

### 1.2 이미 보고 있는 화면에서도 토스트가 다시 뜸

예를 들어 사용자가 이미 `/chats/[id]` 화면을 보고 있는데, 같은 채팅방 새 메시지에 대한 토스트가 다시 뜨면 정보 중복과 시선 분산이 발생합니다.

### 1.3 브라우저 탭과 PWA 푸시의 역할이 섞임

- 탭이 열려 있을 때는 In-App 알림이 더 자연스럽고
- 브라우저가 백그라운드일 때는 푸시가 필요합니다.

이 두 경로를 분리하지 않았을 때 같은 이벤트가 두 번 인지되는 문제가 생겼습니다.

### 1.4 오래된 Service Worker가 최신 라우트 요청을 가로챔

릴리즈 전 점검 중 `/streams/add` 진입 시 아래 유형의 콘솔 메시지가 관찰되었습니다.

```text
The FetchEvent for "https://boardport.life/streams/add" resulted in a network error response
```

같은 브라우저에서 Service Worker를 unregister한 뒤 재진입하면 재현되지 않았기 때문에, 최신 앱 코드 문제가 아니라 이전 배포의 Service Worker/cache가 남아 있던 케이스로 분류했습니다.

## 2. 근본 원인

### 원인 A. 알림 타입별 collapse 정책 부재

채팅, 방송, 거래, 키워드 알림은 모두 성격이 다릅니다.

- 채팅: 채팅방 단위로 최신 상태만 유지하는 편이 자연스러움
- 방송 시작: 방송 단위로 덮어쓰는 편이 적절함
- 키워드 알림: 상품 단위로 개별 알림을 유지하는 편이 나음

즉, 모든 알림을 동일하게 누적시키면 UX가 나빠집니다.

### 원인 B. In-App 알림과 Push 알림의 책임 분리 필요

알림은 다음 2개의 채널을 동시에 사용합니다.

1. Supabase Realtime 기반 In-App 알림
2. Service Worker 기반 Web Push

이 둘을 같은 기준 없이 동시에 발송하면, 사용자는 같은 내용을 여러 경로로 중복 인지하게 됩니다.

### 원인 C. 브라우저/탭 상태에 따른 라우팅 처리 필요

푸시 클릭 시:

- 이미 열린 탭이 있으면 포커스 후 이동
- 없으면 새 창/새 탭 열기

이 분기를 하지 않으면 사용자가 불필요한 중복 탭을 얻게 됩니다.

### 원인 D. Service Worker가 배포보다 늦게 교체되는 케이스 확인

PWA 환경에서는 새 배포가 완료되어도 사용자의 기존 Service Worker가 즉시 교체되지 않을 수 있습니다.
이전 Service Worker가 오래된 cache manifest나 fetch handler로 최신 route를 처리하면서, 실제 서버는 정상인데도 브라우저 콘솔에는 fetch error가 남았습니다.

## 3. 해결 전략

### 전략 1. 알림 타입별 `tag` / `renotify` 정책 분리

푸시 payload에 `tag`와 `renotify`를 명시해 동일 맥락의 브라우저 푸시는 덮어쓰고, 다른 맥락의 푸시는 별도로 유지하도록 했습니다.

주의할 점은 이 정책이 브라우저 Notification API의 `tag` 정책이라는 점입니다.
현재 DB `Notification` 레코드는 메시지/이벤트별로 생성되며, 알림 센터 목록 자체를 같은 tag로 upsert하는 구조는 아닙니다.

예:

- 채팅: `bp-chat-{roomId}`
- 방송 시작: `bp-stream-start-{broadcastId}`
- 거래: `bp-trade-{productId}`
- 키워드: `bp-keyword-{productId}`

### 전략 2. In-App 알림과 Push 알림을 병렬 처리하되, 정책은 분리

- In-App 알림 생성 여부는 타입별 설정(`chat`, `trade`, `stream` 등) 기준
- Push 알림 전송 여부는 여기에 더해:
  - 전역 푸시 ON/OFF
  - 방해 금지 시간
  - 브라우저 구독 상태
    를 함께 확인하도록 분리했습니다.

### 전략 3. 현재 보고 있는 화면과 동일한 알림은 토스트 생략

사용자가 이미 보고 있는 경로와 알림 `link`가 같으면 토스트를 띄우지 않도록 했습니다.

예:

- 현재 `/chats/abc`
- 새 알림 `link === /chats/abc`

이 경우 토스트 표시를 생략해 flicker와 중복 인지를 줄였습니다.
벨 카운트나 DB 알림 반영 여부는 알림 타입과 정책에 따라 별도로 처리합니다.

### 전략 4. Service Worker 클릭 시 기존 탭 우선 재사용

푸시 클릭 시:

1. 이미 열린 `window client`가 있으면 `focus()`
2. 해당 탭을 `navigate(target)`로 이동
3. 없으면 `clients.openWindow(target)`

으로 처리했습니다.

### 전략 5. Service Worker 오류는 unregister 전후로 분리 판단

운영 QA에서 fetch error가 보이면 바로 앱 라우팅 버그로 단정하지 않고 아래 순서로 분리합니다.

1. Network 탭에서 실제 document 요청 status 확인
2. Application 탭에서 현재 Service Worker 상태 확인
3. unregister 후 같은 URL 재진입
4. unregister 후 사라지면 오래된 Service Worker/cache 영향으로 분류
5. 최신 Service Worker에서도 재현되면 릴리즈 차단 이슈로 승격

## 4. 적용한 코드 변경

### 4.1 푸시 payload와 Service Worker 처리

관련 파일:

- [pwa-push.js](../../public/pwa-push.js)
- `sender.ts`

핵심:

- `tag`, `renotify`, `timestamp`, `data.url` 포함
- 클릭 시 기존 탭 포커스 후 이동
- 알림 타입별 기본 `tag`, `urgency`, `TTL` 정책 적용

### 4.2 알림 정책 분리

관련 파일:

- `policy.ts`

핵심:

- `isNotificationTypeEnabled`: 앱 내 알림 생성 허용 여부
- `canSendPushForType`: 푸시 전송 허용 여부
- `pushEnabled`와 `quietHours`를 푸시 정책에만 반영

### 4.3 채팅 푸시 알림 덮어쓰기

관련 파일:

- `message.ts`

핵심:

- 채팅방 단위 `tag/topic` 사용
- 같은 채팅방 브라우저 푸시는 덮어쓰기
- DB 알림은 현재 메시지별 `Notification.create()`로 생성
- 메시지 저장 -> 실시간 브로드캐스트 -> In-App 알림 -> Push 알림 순으로 처리

### 4.4 방송 시작 / 키워드 알림 라우팅

관련 파일:

- `live.ts`
- `keyword.ts`

핵심:

- 팔로우 기반 방송 시작 알림
- 키워드 + 지역 범위 기반 상품 알림
- 둘 다 DB 알림 생성, Realtime 브로드캐스트, Web Push 발송을 분리
- `sent > 0`일 때만 `isPushSent`, `sentAt` 갱신

### 4.5 브라우저 구독 상태와 서버 상태 동기화

관련 파일:

- `usePushNotification.ts`
- `subscribe route`
- `check-subscription route`
- `unsubscribe route`

핵심:

- 브라우저의 `PushManager` 상태와 서버 `PushSubscription` 상태를 정합하게 유지
- 구독 해제 시 서버 전역 OFF를 먼저 처리
- 기존 등록 SW가 없을 때 `/sw.js` 수동 등록 시도

### 4.6 현재 화면과 중복되는 토스트 억제

관련 파일:

- `NotificationListener.tsx`

핵심:

- 현재 `pathname`과 알림 `link`가 같으면 토스트 생략
- Zustand 스토어로 벨 카운트 동기화
- `BAN` 같은 시스템 이벤트도 동일 채널에서 처리

### 4.7 채팅 미읽음 뱃지와 알림 읽음 상태 분리

관련 파일:

- `TabBar.tsx`
- `ChatRoomsRealtimeBridge.tsx`
- `NotificationListener.tsx`
- `unread-count route`

핵심:

- 알림 벨 카운트와 채팅 미읽음 카운트는 의미가 다름
- 알림 모두 읽음은 알림 목록만 정리하고 채팅 메시지 읽음 상태는 변경하지 않음
- 채팅 미읽음 카운트는 `/api/chats/unread-count` 조회 결과와 query cache를 기준으로 동기화
- `rooms_refresh` 브로드캐스트와 `CHAT` 알림 수신은 모두 미읽음 카운트 재검증의 보조 신호로 사용
- 채팅방 진입 또는 메시지 읽음 처리 시에만 채팅 미읽음 수 감소
- `ChatRoomsRealtimeBridge`는 앱 전역에서 사용자 단위 채널을 한 번만 구독하고, `pagehide`/hidden 상태에서는 채널을 정리한 뒤 복귀 시 재구독과 서버 재검증을 수행

### 4.8 문서화 과정에서 발견한 추가 정합성 버그

문서를 정리하면서 실제 코드와 정책을 다시 대조했고, 아래 버그를 추가로 수정했습니다.

- 일부 도메인에서 `sendPushNotification()`의 성공 판정을 `result.sent`로 보고 있어
  실제 발송 성공 후에도 `Notification.isPushSent`, `sentAt`가 갱신되지 않던 문제
- `SYSTEM` 알림 기본 tag가 `KEYWORD` 분기로 폴스루되어
  시스템 알림이 키워드 알림 정책으로 잘못 묶일 수 있던 문제
- 푸시 구독 완료 후 Welcome 알림이 실제 존재하지 않는 경로(`/profile/notifications`)로
  이동하도록 연결되어 있던 문제
- 알림 설정 페이지 로그인 콜백도 동일하게 실제 없는 경로(`/profile/notifications`)를
  가리키고 있어 로그인 후 원래 설정 페이지로 복귀하지 못하던 문제

관련 파일:

- `keyword.ts`
- `live.ts`
- `create.ts`
- `badge.ts`
- `update.ts`
- `sender.ts`
- `subscription.ts`
- `subscribe route`
- `app/(app)/(tabs)/profile/notifications/setting/page.tsx`

### 4.9 릴리즈 전 Service Worker 상태 확인

관련 파일:

- [pwa-push.js](../../public/pwa-push.js)
- `app/sw.ts`
- `app/(public)/offline/page.tsx`
- `next.config.mjs`

확인 기준:

- `/sw.js`가 `activated and running` 상태인지 확인
- 새 배포 후 주요 route에서 document 요청이 200을 반환하는지 확인
- fetch error가 보이면 unregister 전후 재현 여부를 비교
- unregister 후 사라지는 오류는 기존 사용자 cache 전파 이슈로 기록
- unregister 후에도 재현되는 오류만 앱 코드 또는 Serwist 설정 문제로 분석

## 5. 결과

### 같은 채팅방 푸시 알림

- 동일 채팅방 새 메시지는 브라우저 푸시 트레이에서 같은 tag 기준으로 최신 상태로 덮어쓰기
- 알림 센터 DB 목록은 현재 메시지별 알림 생성 구조를 유지

### 같은 방송 푸시 알림

- 같은 방송 시작 푸시는 방송 단위 tag로 정리

### 현재 화면 중복 인지 감소

- 이미 보고 있는 채팅방 / 페이지에 대한 토스트 중복 표시 감소

### 채팅 미읽음 뱃지 정책 명확화

- 알림 모두 읽음은 채팅 읽음 처리로 간주하지 않음
- 새 채팅 수신 시 TabBar 미읽음 수는 Realtime 신호와 API 재조회로 동기화
- 채팅방 진입 후 읽음 처리 결과가 반영되면 TabBar 미읽음 수 감소
- 탭 이동이나 브라우저 visibility 전환 뒤에도 앱 전역 브리지가 채팅방 목록과 미읽음 수를 재검증

### 푸시 클릭 동선 정리

- 새 탭을 무조건 늘리지 않고, 기존 탭을 우선 재사용

### 알림 설정/웰컴 알림 경로 정합성 확보

- 푸시 구독 직후 이동 경로와 로그인 복귀 경로가 모두 실제 설정 페이지(`/profile/notifications/setting`)로 통일됨

### 오래된 Service Worker 오류 분리 기준 확보

- 최신 코드에서 재현되는 fetch error와 기존 Service Worker/cache 잔존 오류를 구분
- unregister 후 사라지는 문제는 배포 전파/캐시 문제로 분류
- 최신 Service Worker에서도 재현되는 문제만 릴리즈 차단 대상으로 승격

## 6. 이번에 확인한 점

### 6.1 알림은 "보내는 것"보다 "겹치지 않게 보이게 하는 것"이 더 중요하다

실시간 제품에서는 알림이 안 오는 문제만큼이나, 같은 알림이 여러 번 보이는 문제가 피로를 만듭니다.

### 6.2 In-App과 Push는 같은 알림이 아니라 다른 채널이다

둘 다 같은 이벤트를 다루지만, 노출 정책까지 같을 필요는 없었습니다.

### 6.3 `tag` 정책은 UX 설계다

기술적으로는 Notification API 옵션이지만, 실제로는 어떤 알림을 누적시키고 어떤 알림을 덮어쓸지에 대한 제품 정책입니다.

### 6.4 브라우저 구독 상태와 서버 구독 상태는 따로 관리해야 한다

브라우저는 구독 중인데 서버에서 비활성화된 상태일 수 있고, 반대 경우도 가능합니다. 이 둘을 주기적으로 맞추지 않으면 푸시 정책이 어긋납니다.

### 6.5 PWA 오류는 최신 코드와 기존 Service Worker를 분리해서 봐야 한다

PWA는 브라우저가 이전 실행 단위를 계속 들고 있을 수 있습니다.
따라서 배포 직후 콘솔 오류는 최신 서버 코드, 최신 Service Worker, 이전 Service Worker/cache 중 어느 계층에서 발생했는지 먼저 나눠야 합니다.

### 6.6 알림 읽음과 도메인 읽음은 분리해야 한다

알림 센터에서 모두 읽음을 눌렀다는 것은 "알림을 확인했다"는 의미이지, 채팅 메시지를 실제로 읽었다는 의미는 아닙니다.

따라서 알림 읽음 상태와 채팅방 메시지 읽음 상태는 별도로 유지해야 UX 해석이 명확합니다.

## 7. 정리

이 사례의 핵심은 푸시 알림을 하나의 발송 기능이 아니라, 아래 계층으로 나누어 설계한 데 있습니다.

1. 알림 DB 생성
2. In-App Realtime 브로드캐스트
3. 브라우저 Push 전송
4. 클릭 시 라우팅 / 기존 탭 재사용
5. Service Worker/cache 상태 분리 판단

그 결과 BoardPort의 알림은 단순 발송 기능이 아니라, **중복 제어와 문맥 라우팅을 함께 다루는 알림 시스템**에 가까워졌습니다.

## 8. 함께 보면 좋은 문서

- [상태 관리 아키텍처 현대화](../architecture/case-study-state-management-modernization.md)
- [제품 상세 모달/편집 라우팅 트러블슈팅](./troubleshooting-product-modal-routing.md)
- [BoardPort UI/UX 디자인 기준](../design/boardport-uiux-design-standard.md)
