# BoardPort

BoardPort는 보드게임 중고거래에서 자주 분리되는 상품 탐색, 문의, 직거래 약속, 후기, 콘텐츠, 운영 흐름을 하나의 서비스로 연결한 모바일 퍼스트 웹 애플리케이션입니다.

범용 중고거래 앱에서 부족한 보드게임 특화 맥락을 보완하기 위해, 거래·룰 질문·후기·플레이 공유가 자연스럽게 이어지는 흐름에 초점을 맞췄습니다.

## Summary

| 항목         | 내용                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Project Type | Personal Full-Stack Project                                                                                    |
| Period       | 2024.10.14 - 2026.06                                                                                           |
| Domain       | Board Game Marketplace · Community · Live Streaming · Chat                                                     |
| Core Stack   | Next.js 14 App Router, React 18, TypeScript, Prisma, PostgreSQL, TanStack Query v5, Zustand, Supabase Realtime |

## Key Engineering Problems

| 문제                                                              | 해결 방향                                                                                                                                                 | 관련 문서                                                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 채팅 약속 수락과 상품 예약 상태가 어긋날 수 있음                  | 약속 수락, 상품 예약 전환, 다른 대기 약속 취소, 시스템 메시지를 하나의 transaction으로 묶고 `updateMany` 조건으로 동시 수락을 방어                        | [Appointment Atomic Transition](./docs/troubleshooting/troubleshooting-appointment-atomic-transition.md) |
| App Router 모달 상세와 일반 상세의 복귀 문맥이 섞임               | Intercepting Route 모달, 일반 상세, 수정/삭제 복귀를 `returnTo`, `flow`, refresh flag로 분리하고 mixed tree 케이스를 문맥별로 정리                        | [Product Modal Routing](./docs/troubleshooting/troubleshooting-product-modal-routing.md)                 |
| 외부 동영상 인코딩 이벤트와 게시글 저장 순서가 보장되지 않음      | Cloudflare webhook의 READY 선도착과 error payload를 처리하고, `draftKey`를 실제 게시글 연결 전까지 보존해 READY/FAILED 상태로 수렴                        | [Post Video Webhook](./docs/troubleshooting/troubleshooting-post-video-cloudflare-webhook.md)            |
| Server State, UI State, Realtime 이벤트가 섞여 갱신 기준이 분산됨 | Zustand는 UI 상태, TanStack Query는 서버 상태, Realtime은 invalidate/refetch 신호로 분리하고 Route Handler fetch와 Query Key Factory로 재검증 경로를 통일 | [State Management Modernization](./docs/architecture/case-study-state-management-modernization.md)       |

각 문서는 릴리즈 전 QA에서 확인한 증상, 원인, 코드 기준, 운영 판단을 중심으로 정리했습니다.

## Demo

- Production: [https://boardport.life](https://boardport.life)
- Demo Password: 모든 데모 계정 공통 `BoardPort!234`

| Role      | Email                         | What to Check                          |
| --------- | ----------------------------- | -------------------------------------- |
| Main User | `buyer_casual@boardport.life` | 상품 탐색, 찜, 채팅, 거래/후기, 프로필 |
| Seller    | `seller_euro@boardport.life`  | 판매 상품, 예약/판매 상태, 거래 관리   |
| Streamer  | `rules_helper@boardport.life` | 라이브 방송, VOD, 도감/게시글 연결     |
| Admin     | `admin@boardport.life`        | 신고 처리, 제재, 감사 로그             |

<!-- markdownlint-disable MD033 -->

### Overview

BoardPort의 주요 도메인을 빠르게 훑어보는 전체 흐름입니다.

<video src="https://github.com/user-attachments/assets/ca062392-83cf-47c9-8903-70a098b19f41" controls muted playsinline width="100%"></video>

## Feature Flow

BoardPort는 거래, 커뮤니티, 방송, 알림, 관리자 운영이 독립적으로 동작하면서 보드게임 도감으로 콘텐츠 맥락을 연결합니다.

![BoardPort Feature Flow](./docs/assets/readme/boardport-feature-flow.png)

## Feature Tour

<details>
<summary><strong>기능별 데모 영상 펼쳐보기</strong></summary>

### Auth & Onboarding

회원가입 이후 온보딩과 초기 프로필 진입까지 이어지는 첫 사용 흐름입니다.

<video src="https://github.com/user-attachments/assets/383eda82-e658-44d1-8951-4cfbf5d5fe7a" controls muted playsinline width="100%"></video>

### Marketplace Discovery

지역 변경, 검색, 분류, 상세 필터, 키워드 알림 등록까지 이어지는 상품 탐색 흐름입니다.

<video src="https://github.com/user-attachments/assets/ac806637-ee7d-4a19-8ae7-87172ce7a744" controls muted playsinline width="100%"></video>

### Product Trade

상품 상세에서 도감 정보와 이미지 확대를 확인한 뒤, 채팅과 약속 조율로 이어지는 거래 흐름입니다.

<video src="https://github.com/user-attachments/assets/aa37595e-ae46-4cad-a8bc-56a12e4bb417" controls muted playsinline width="100%"></video>

### Chat & Appointment

상품 기반 채팅에서 이미지 첨부, 직거래 약속 제안, 상대방 수락까지 이어지는 거래 조율 흐름입니다.

<video src="https://github.com/user-attachments/assets/fdf8b9ce-c013-438d-9d5f-68a6b2bdbf19" controls muted playsinline width="100%"></video>

### Live & VOD

프로필 방송국에서 라이브로 진입해 채팅과 공지를 확인하고, VOD 목록까지 이어지는 방송 흐름입니다.

<video src="https://github.com/user-attachments/assets/7c72c5ce-9e0e-4a1e-9cfd-5289557abca3" controls muted playsinline width="100%"></video>

### BoardGame Catalog

보드게임 도감 검색과 상세 정보, 관련 상품/게시글/방송 연결 흐름입니다.

<video src="https://github.com/user-attachments/assets/3ac2f8ce-146c-4fc2-a3af-33236cb3b9e7" controls muted playsinline width="100%"></video>

### Profile Activity

프로필에서 찜, 판매/구매 내역, 후기, 뱃지, 방송 활동을 확인하는 사용자 활동 허브입니다.

<video src="https://github.com/user-attachments/assets/90b3c5dd-934c-428b-9bc9-94f44de3731c" controls muted playsinline width="100%"></video>

### Admin Console

신고 처리, 제재, 감사 로그까지 이어지는 관리자 운영 흐름입니다.

<video src="https://github.com/user-attachments/assets/06ae878a-5123-42d4-ab05-181cdfcf1971" controls muted playsinline width="100%"></video>

</details>

<!-- markdownlint-enable MD033 -->

## System Architecture

Next.js App Router를 중심으로 도메인 모듈, 서버 액션, 실시간 채팅, 미디어 처리, PWA 알림, 관리자 흐름을 분리했습니다.

![BoardPort System Architecture](./docs/assets/readme/boardport-system-architecture.png)

## Technical Highlights

### Feature-first Architecture

상품, 게시글, 채팅, 방송, 알림, 관리자 기능이 커지면서 파일 위치보다 도메인 책임 기준으로 코드를 찾을 수 있게 구조를 정리했습니다.

- `features/*` 중심의 도메인 분리
- `actions / service / hooks / components / types / constants / selects / utils` 책임 분리
- `app/(public)`과 `app/(app)` 라우트 그룹으로 공개/인증 영역 분리

### Server/Client State 분리와 SSR 안전성

초기에는 로컬 UI 상태, 서버 캐시, 변경 액션이 한 화면 안에 섞여 회귀 위험이 컸고, 상태 성격에 따라 책임을 나눴습니다.

- UI 상태는 Zustand Store Factory로 분리해 SSR 요청 간 상태 공유 위험을 줄임
- 서버 상태는 TanStack Query와 Query Key Factory로 관리
- Server Component의 초기 데이터와 prefetch는 service 계층 직접 호출
- Client Component의 queryFn 재조회는 Route Handler fetch로 분리
- 생성/수정/삭제/토글 같은 사용자 의도 기반 변경은 Server Action 유지

### 채팅·방송·푸시 알림의 실시간 동기화

채팅, 방송, 알림처럼 실시간 이벤트가 많은 영역은 이벤트 자체를 최종 상태로 믿기보다 DB 기준 재검증 신호로 사용했습니다.

- 채팅 목록/미읽음 수는 앱 전역 bridge와 query invalidation 기준으로 동기화
- 방송 live-status 구독 지점을 상세 셸로 모아 하위 컴포넌트는 props 기반 표시
- In-App 알림과 Web Push를 분리하고, Service Worker 클릭/중복 알림 정책 정리

### 모달 라우팅과 공유/복귀 흐름 안정화

App Router의 일반 상세 페이지와 모달 상세 페이지가 같은 데이터를 다루면서도, 뒤로가기와 공유 링크가 깨지지 않도록 라우팅 책임을 분리했습니다.

- 제품 상세는 일반 페이지와 Intercepting Route 모달을 함께 지원
- `returnTo`, `flow`, refresh flag로 편집/삭제 후 복귀 흐름 안정화
- 제품/게시글/방송 상세는 Next Metadata 이미지와 소셜 크롤러용 고정 `/og-image` Route Handler를 분리

## Main Features

- **Auth & User**
  Kakao OAuth, SMS 로그인, 이메일 기반 비밀번호 재설정, 온보딩, 프로필/지역 설정, 팔로우, 차단, 활동 뱃지

- **Product Marketplace**
  보드게임 특화 상품 등록, 지역 기반 탐색, 무한 스크롤, 리스트/그리드 전환, 좋아요, 최근 본 상품, 거래 상태 전이, 리뷰 연결

- **BoardGame Catalog**
  Kaggle CSV 기반 BGG 구조화 메타데이터와 한국어 검수 데이터를 활용한 도감, 검색/필터/페이지 이동, 상품·게시글·방송 연결

- **Community Posts**
  카테고리 게시글, 댓글/대댓글, 위치 정보, 이미지/동영상/임베드 블록, 공유 미리보기

- **Chat & Appointment**
  상품 기반 1:1 채팅, Supabase Realtime, 미읽음 뱃지, 직거래 약속 제안/수락/취소, 카카오맵 장소 제안

- **Live Stream & VOD**
  Cloudflare Stream 기반 방송 생성/재생, 공개/팔로워/비공개 접근 제어, 다시보기, 좋아요/댓글/조회수 메타, 모바일 미리보기

- **Notification**
  In-App 알림, PWA Web Push, 키워드/지역 알림, 채팅/거래/방송/시스템 알림 설정

- **Admin**
  신고 처리, 콘텐츠 조치, 유저 제재, 감사 로그, ECharts 기반 관리자 인사이트

## Tech Stack

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Framer Motion, Floating UI, Apache ECharts
- **State:** TanStack Query v5, Zustand
- **Backend/Data:** Prisma, PostgreSQL, iron-session
- **Realtime/Infra:** Supabase Realtime, Cloudflare Stream/Images, Web Push API, next-pwa, Vercel
- **External APIs:** Kakao OAuth, Kakao Maps/Local API, CoolSMS, Resend

## Recommended Reading

핵심 설계 판단과 문제 해결 사례만 추려두었습니다. 전체 문서 인덱스는 [docs/README.md](./docs/README.md)에서 확인할 수 있습니다.

- [Project Overview](./docs/architecture/boardport-project-overview.md)
- [State Management Modernization](./docs/architecture/case-study-state-management-modernization.md)
- [Appointment Atomic Transition Troubleshooting](./docs/troubleshooting/troubleshooting-appointment-atomic-transition.md)
- [Post Video Cloudflare Webhook Troubleshooting](./docs/troubleshooting/troubleshooting-post-video-cloudflare-webhook.md)
- [Product Modal Routing Troubleshooting](./docs/troubleshooting/troubleshooting-product-modal-routing.md)
- [Access Control Matrix](./docs/operations/access-control-matrix.md)
- [PWA Web Push Routing Troubleshooting](./docs/troubleshooting/troubleshooting-pwa-web-push-routing.md)

## Project Structure

```text
app/          App Router 페이지, 레이아웃, 메타 라우트, Route Handler
components/   전역 레이아웃 및 공통 UI 컴포넌트
docs/         공개용 설계, 운영, 트러블슈팅 문서
features/     도메인별 비즈니스 로직과 UI
hooks/        공용 hooks
lib/          세션, query keys, store, 공통 유틸
prisma/       Prisma schema, seed, migration
```

## Local Development

1. 의존성을 설치합니다.

```bash
npm install
```

2. `.env.example`을 참고해 `.env.local`에 필수 환경 변수를 채웁니다.

3. 로컬 또는 개발 DB에 Prisma 마이그레이션을 적용합니다.

```bash
npx prisma migrate dev
```

4. 기본 데이터가 필요하면 seed를 실행합니다.

```bash
npx prisma db seed
```

5. 개발 서버를 실행합니다.

```bash
npm run dev
```

외부 연동이 필요한 로그인, SMS, 이메일, 지도, 이미지, 방송, 푸시 알림 기능은 해당 서비스의 환경 변수가 설정되어야 정상 동작합니다.

### 필수 환경 변수

실제 값은 `.env` 또는 Vercel Environment Variables에 설정하고 저장소에는 커밋하지 않습니다.

#### App / Security

| 변수명                | 설명                                          |
| --------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | 대표 URL, 인증 콜백, 공유 링크 기준 URL       |
| `COOKIE_PASSWORD`     | iron-session 쿠키 암호화 키                   |
| `RATE_LIMIT_SALT`     | IP 기반 rate limit hash 생성용 서버 시크릿 키 |
| `CRON_SECRET`         | Vercel Cron 호출 인증용 시크릿 키             |

#### Database

| 변수명         | 설명                                       |
| -------------- | ------------------------------------------ |
| `DATABASE_URL` | 런타임 PostgreSQL 연결 문자열              |
| `DIRECT_URL`   | Prisma 마이그레이션/CLI용 직접 연결 문자열 |

#### Supabase

| 변수명                            | 설명                  |
| --------------------------------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` | Supabase 공개 anon 키 |

#### OAuth

| 변수명                 | 설명                              |
| ---------------------- | --------------------------------- |
| `GITHUB_CLIENT_ID`     | GitHub OAuth 클라이언트 ID        |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth 클라이언트 시크릿 키 |
| `KAKAO_CLIENT_ID`      | Kakao OAuth 클라이언트 ID         |
| `KAKAO_CLIENT_SECRET`  | Kakao OAuth 클라이언트 시크릿 키  |
| `KAKAO_REDIRECT_URI`   | Kakao OAuth 리다이렉트 URI        |

#### SMS (CoolSMS)

| 변수명                  | 설명                  |
| ----------------------- | --------------------- |
| `COOLSMS_API_KEY`       | CoolSMS API 키        |
| `COOLSMS_API_SECRET`    | CoolSMS API 시크릿 키 |
| `COOLSMS_SENDER_NUMBER` | CoolSMS 발신 번호     |

#### Email (Resend)

| 변수명           | 설명                      |
| ---------------- | ------------------------- |
| `RESEND_API_KEY` | Resend 이메일 발송 API 키 |

#### Cloudflare

| 변수명                                 | 설명                                         |
| -------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH`  | Cloudflare Images 이미지 제공 해시           |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN` | Cloudflare Stream 재생 도메인                |
| `CLOUDFLARE_ACCOUNT_ID`                | Cloudflare 계정 ID                           |
| `CLOUDFLARE_API_TOKEN`                 | Cloudflare API 토큰                          |
| `CLOUDFLARE_WEBHOOK_SECRET`            | Cloudflare 웹훅 요청 검증용 시크릿 키        |
| `CLOUDFLARE_STREAM_WEBHOOK_SECRET`     | Cloudflare Stream 웹훅 서명 검증용 시크릿 키 |

#### Push

| 변수명                         | 설명                  |
| ------------------------------ | --------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID 공개키 |
| `VAPID_PRIVATE_KEY`            | Web Push VAPID 개인키 |

#### Maps

| 변수명                          | 설명                          |
| ------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_KAKAO_MAP_API_KEY` | 카카오 지도 JavaScript SDK 키 |

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
```
