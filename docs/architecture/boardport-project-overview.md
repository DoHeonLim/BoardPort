# BoardPort 프로젝트 개요

## 1. 프로젝트 요약

BoardPort는 보드게임 거래와 커뮤니티 활동을 하나의 서비스 흐름으로 연결한 모바일 퍼스트 웹 애플리케이션입니다.

단순 상품 등록/거래에 그치지 않고, 게임 정보 탐색, 룰 질문, 채팅 약속, 라이브/VOD 기반 플레이 공유까지 이어지는 경험을 목표로 했습니다.

| 항목        | 내용                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------- |
| 개발 형태   | 1인 Next.js 웹 서비스 프로젝트                                                                    |
| 개발 기간   | 2024.10 - 2026.07                                                                                 |
| 핵심 도메인 | 상품 거래, 보드게임 도감, 게시글, 채팅 약속, 방송/VOD, 알림, 관리자                               |
| 주요 기술   | Next.js 14 App Router, TypeScript, Prisma, PostgreSQL, TanStack Query, Zustand, Supabase Realtime |

## 2. 개발 흐름

BoardPort는 거래 중심 MVP에서 시작해 도메인을 확장하고, 이후 상태 관리와 운영 품질을 정리하는 방향으로 발전했습니다.

| 단계             | 기간              | 중심 작업                                                                                                                                          |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 초기 MVP         | 2024.10 - 2025.04 | 인증, 프로필, 상품 거래, 기본 게시글/리뷰 흐름 구축                                                                                                |
| 도메인 확장      | 2025.05 - 2025.11 | 채팅, 직거래 약속, 검색, 게시글, 스트리밍, 알림 구조 확장                                                                                          |
| 구조/운영 고도화 | 2025.12 - 2026.02 | Feature-first 구조 이관, UI/UX 리디자인, 관리자/지도/거래 상태, Cloudflare 웹훅 안정화                                                             |
| 안정화와 문서화  | 2026.03 - 2026.07 | TanStack Query 기반 상태 정리, App Router 라우팅 안정화, 보드게임 도감, 릴리즈 QA, 데모 영상, 공개 문서, Android TWA와 약관/개인정보 처리방침 정리 |

## 3. 해결하려 한 문제

범용 중고거래 서비스는 보드게임 거래에 필요한 맥락을 충분히 담기 어렵습니다.

- 구성품 상태, 플레이 인원, 게임 장르 같은 상품 메타데이터가 부족함
- 거래 전후의 룰 질문, 후기, 모임, 플레이 공유가 흩어짐
- 직거래 약속과 채팅, 알림, 상태 변경이 서로 느슨하게 연결됨
- 관리자 입장에서 신고, 제재, 방송, 유저 상태를 한 흐름으로 보기 어려움

BoardPort는 이 문제를 **거래 → 소통 → 약속 → 플레이 공유 → 운영 관리** 흐름으로 연결해 해결하고자 했습니다.

초기에는 기능 단위로 구현을 확장하면서 도메인별 로컬 상태와 서버 캐시 갱신이 함께 처리되는 경우가 많았습니다. 기능이 늘어나면서 로컬 상태, 서버 캐시, 실시간 이벤트의 책임을 기준별로 분리할 필요가 생겼습니다.

## 4. 핵심 기능

### Auth & User

- Kakao OAuth, SMS 로그인, 이메일 기반 비밀번호 재설정
- 로그인 후 1회 온보딩으로 닉네임, 지역, 이메일 보완
- 팔로우, 차단, 활동 뱃지, 프로필 수정

### Product Marketplace

- 보드게임 특화 상품 등록
- 지역 기반 탐색, 무한 스크롤, 검색/필터, 리스트/그리드 전환
- 판매중, 예약중, 판매완료 상태 전환
- 찜, 최근 본 상품, 거래 후기 연결

### BoardGame Catalog

- Kaggle CSV 기반 BGG 구조화 메타데이터와 한국어 검수 데이터를 분리 관리
- 보드게임 검색, 필터, 페이지 이동
- 상품, 게시글, 방송과 기준 보드게임 연결
- 관리자 CSV import와 PUBLISHED 기준 공개

### Community Posts

- 카테고리 게시글, 댓글/대댓글
- 텍스트, 이미지, 동영상, 임베드 블록 기반 콘텐츠
- Cloudflare 웹훅 기반 동영상 처리 상태 관리

### Chat & Appointment

- 상품 기반 1:1 채팅
- Supabase Realtime 기반 메시지 송수신
- 미읽음 뱃지, 채팅방 목록 재검증
- 카카오맵 기반 직거래 장소 제안
- 약속 수락 시 상품 예약 상태와 약속 상태를 트랜잭션으로 동기화

### Live Stream & VOD

- Cloudflare Stream 기반 방송 생성/재생
- 공개, 팔로워, 비공개 방송 접근 제어
- 방송 종료 후 VOD 아카이빙
- 다시보기 좋아요, 댓글, 조회수, 길이 메타데이터

### Notification

- PWA Web Push와 In-App 알림 분리
- 키워드/지역 기반 알림

### Admin

- 관리자 신고 처리, 유저 제재, 감사 로그
- ECharts 기반 운영 인사이트

## 5. 아키텍처 요약

```text
Browser / PWA
  -> Next.js App Router
    -> Server Components
    -> Client Components
    -> Route Handlers
    -> Server Actions
  -> Feature Modules
    -> actions / service / hooks / components / types
  -> Prisma / PostgreSQL
  -> Supabase Realtime
  -> Cloudflare Stream / Images
  -> Kakao / CoolSMS / Resend / Web Push
```

### 라우팅 구조

- `app/(public)`: 로그인, 회원가입, 공개 진입 화면
- `app/(app)`: 로그인 후 접근 가능한 주요 서비스 화면
- `middleware.ts`: 공개 경로, 게스트 전용 경로, 관리자 경로 보호
- `robots.ts`, `sitemap.ts`: 로그인 기반 서비스에 맞춘 최소 공개 색인

### 도메인 구조

```text
features/
  auth/
  product/
  boardgame/
  post/
  chat/
  stream/
  notification/
  user/
  report/
  review/
```

각 도메인은 필요한 만큼 아래 책임을 나눕니다.

```text
actions/      Server Action 진입점
service/      DB 조회와 비즈니스 규칙
hooks/        클라이언트 데이터/상호작용 훅
components/   도메인 UI
types.ts      DTO와 UI 타입
selects.ts    Prisma select 기준
constants.ts  도메인 상수
utils/        순수 유틸
```

## 6. 주요 설계 판단

### Client State / Server State 분리

- 모달, 알림 UI 상태는 Zustand Store Factory로 관리
- 목록, 댓글, 좋아요, 채팅방, 다시보기 같은 서버 데이터는 TanStack Query로 관리
- Query Key Factory로 prefetch, hydration, invalidate 기준을 통일

상태 관리 쪽 변화는 [상태 관리 아키텍처 현대화](./case-study-state-management-modernization.md)에서 별도로 다룹니다.

### 조회와 변경 경로 분리

- Server Component의 초기 조회와 prefetch는 service 계층 또는 조회용 Server Action을 서버에서 호출
- 주요 자동 재조회 목록의 Client Component queryFn은 Route Handler fetch 사용
- 채팅 메시지, 리뷰, 팔로우, 검색 기록처럼 일부 세션 의존·기존 조회는 Server Action 유지
- 생성, 수정, 삭제, 토글 같은 사용자 의도 기반 변경은 Server Action 유지

이 기준을 주요 목록에 적용한 뒤 초기 렌더 중 Server Function 호출 오류와 hydration 이후 재검증 경로 혼선이 줄었습니다.

### 캐시와 개인화 데이터 분리

BoardPort는 로그인 기반 서비스이기 때문에 공개 데이터와 사용자별 개인화 데이터가 같은 화면에 함께 나타납니다. 이를 구분하기 위해 캐시 가능한 공용 데이터와 요청 시점에 계산해야 하는 개인화 데이터를 분리했습니다.

- 공용 데이터: 상품, 게시글, 방송/VOD, 프로필 기본 정보
- 개인화 데이터: 좋아요 여부, 팔로우 여부, 읽음 상태, 접근 권한
- 변경 작업 이후에는 서버 캐시 revalidation과 클라이언트 query invalidation을 함께 사용해 UI가 DB 기준 상태로 수렴하도록 설계

이 기준을 통해 정적 캐시의 이점은 유지하면서도, 사용자별 상태가 오래된 값으로 노출되는 위험을 줄였습니다.

### 실시간 데이터는 즉시 반영과 재검증으로 분리

Realtime 이벤트는 화면 특성에 따라 payload를 즉시 반영하거나, 필요한 query와 서버 렌더 결과를 재검증하는 신호로 사용했습니다.

- 채팅 메시지는 payload를 Query Cache에 즉시 반영
- 알림은 payload로 Zustand 카운트와 토스트를 즉시 갱신
- 채팅방 목록과 TabBar 미읽음 수 재검증
- 방송 live-status는 상세 셸에서 한 번만 구독하고 payload callback과 `router.refresh()`를 함께 사용
- 알림은 pagehide/visibility 전환 시 정리와 복귀 동기화

### 소셜 공유 이미지 경로 분리

- `opengraph-image.tsx`: Next.js Metadata API 기본 이미지
- `/og-image` Route Handler: 소셜 크롤러와 수동 QA가 안정적으로 접근하는 고정 PNG 경로

Windows 로컬 `next/og` 폰트 경로 문제는 sharp 기반 PNG 생성으로 우회했습니다.

## 7. 기술 선택 기준

BoardPort는 라이브러리 자체보다 상태와 도메인의 성격에 맞는 역할 분리를 우선했습니다.

| 기술                     | 선택 이유                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Query           | 목록, 댓글, 좋아요, 채팅방처럼 서버 상태 캐시와 재검증이 반복되는 영역을 query key 기준으로 관리하기 위해 선택                               |
| Zustand                  | 서버 데이터가 아닌 모달, 알림 패널 같은 UI 상태를 가볍게 분리하고, Store Factory로 SSR 요청 간 공유 위험을 줄이기 위해 선택                  |
| Supabase Realtime        | 별도 WebSocket 서버를 직접 운영하기보다 채팅·알림 payload를 즉시 전달하고 목록·미읽음 수·방송 상태를 재검증하기 위해 선택                    |
| Prisma                   | 상품, 채팅, 약속, 방송, 신고처럼 관계가 많은 도메인을 타입 기반 query와 transaction으로 다루기 위해 선택                                     |
| Cloudflare Stream/Images | Images는 서버가 발급한 Direct Upload URL로 이미지를 업로드하고, Stream은 라이브/VOD 처리 결과를 webhook으로 내부 상태와 동기화하기 위해 선택 |

## 8. 주요 설계 포인트

- 도메인별 기능 수를 늘리는 것보다 **기능 간 상태 정합성**을 해결하는 데 집중
- App Router의 Server Component, Server Action, Route Handler 역할을 분리
- TanStack Query와 Zustand를 도입하되, 라이브러리 사용 자체보다 상태의 성격을 재분류
- Realtime, Web Push, Cloudflare 웹훅처럼 비동기 이벤트가 많은 환경에서 즉시 반영과 DB 확정 상태 재검증을 구분
- 운영자 화면, 신고, 제재, 감사 로그까지 포함해 서비스 운영 흐름을 설계

## 9. 함께 보면 좋은 문서

- [상태 관리 아키텍처 현대화](./case-study-state-management-modernization.md)
- [제품 상세 모달/편집 라우팅 트러블슈팅](../troubleshooting/troubleshooting-product-modal-routing.md)
- [직거래 약속 수락과 상품 상태 원자적 전환 트러블슈팅](../troubleshooting/troubleshooting-appointment-atomic-transition.md)
- [PWA Web Push 중복 제어와 알림 라우팅 트러블슈팅](../troubleshooting/troubleshooting-pwa-web-push-routing.md)
