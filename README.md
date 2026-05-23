# BoardPort

BoardPort는 보드게임 거래, 커뮤니티, 채팅 약속, 라이브 방송, 알림, 관리자 운영을 하나의 사용자 흐름으로 연결한 모바일 퍼스트 웹 애플리케이션입니다.

범용 중고거래 앱에서 부족한 보드게임 특화 맥락을 보완하기 위해, 거래·룰 질문·후기·플레이 공유가 자연스럽게 이어지는 흐름에 초점을 맞췄습니다.

## Summary

| 항목         | 내용                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Project Type | Personal Full-Stack Project                                                                                    |
| Period       | 2024.10.14 - 2026.05.19                                                                                        |
| Domain       | Board Game Marketplace · Community · Live Streaming · Chat                                                     |
| Core Stack   | Next.js 14 App Router, React 18, TypeScript, Prisma, PostgreSQL, TanStack Query v5, Zustand, Supabase Realtime |

## Demo

- Production: [https://boardport.life](https://boardport.life)
- Test Account: 추가 예정

## Screenshots

이미지는 추후 GitHub attachment URL 또는 `docs/assets/screenshots` 경로로 추가할 예정입니다.

| Marketplace | Chat & Appointment | Live / VOD |
| ----------- | ------------------ | ---------- |
| 준비 중     | 준비 중            | 준비 중    |

| BoardGame Catalog | Admin   |
| ----------------- | ------- |
| 준비 중           | 준비 중 |

## Technical Highlights

### Feature-first Architecture

- `features/*` 중심의 도메인 분리
- `actions / service / hooks / components / types / constants / selects / utils` 책임 분리
- `app/(public)`과 `app/(app)` 라우트 그룹으로 공개/인증 영역 분리

### State & Data Fetching

- UI 상태는 Zustand Store Factory로 분리해 SSR 요청 간 상태 공유 위험을 줄임
- 서버 상태는 TanStack Query와 Query Key Factory로 관리
- Server Component의 초기 데이터와 prefetch는 service 계층 직접 호출
- Client Component의 queryFn 재조회는 Route Handler fetch로 분리
- 생성/수정/삭제/토글 같은 사용자 의도 기반 변경은 Server Action 유지

### Realtime & Notification

- 채팅 목록/미읽음 수는 앱 전역 bridge와 query invalidation 기준으로 동기화
- 방송 live-status 구독 지점을 상세 셸로 모아 하위 컴포넌트는 props 기반 표시
- In-App 알림과 Web Push를 분리하고, Service Worker 클릭/중복 알림 정책 정리

### Routing & Sharing

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

- **Notification & Admin**
  PWA Web Push, 키워드/지역 알림, 신고 처리, 유저 제재, 감사 로그, 관리자 인사이트

## Tech Stack

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Framer Motion, Floating UI
- **State:** TanStack Query v5, Zustand
- **Backend/Data:** Prisma, PostgreSQL, iron-session
- **Realtime/Infra:** Supabase Realtime, Cloudflare Stream/Images, Web Push API, next-pwa, Vercel
- **External APIs:** Kakao OAuth, Kakao Maps/Local API, CoolSMS, Resend

## Recommended Reading

- [Project Overview](./docs/architecture/boardport-project-overview.md)
- [State Management Modernization](./docs/architecture/case-study-state-management-modernization.md)
- [UI/UX Design Standard](./docs/design/boardport-uiux-design-standard.md)
- [Product Modal Routing Troubleshooting](./docs/troubleshooting/troubleshooting-product-modal-routing.md)
- [Appointment Atomic Transition Troubleshooting](./docs/troubleshooting/troubleshooting-appointment-atomic-transition.md)
- [PWA Web Push Routing Troubleshooting](./docs/troubleshooting/troubleshooting-pwa-web-push-routing.md)

더 자세한 설계와 트러블슈팅 기록은 [docs/README.md](./docs/README.md)에 묶어두었습니다.

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

```bash
npm install
npm run dev
```

### 필수 환경 변수

실제 값은 `.env` 또는 Vercel Environment Variables에 설정하고 저장소에는 커밋하지 않습니다.

#### Core

| 변수명                | 설명                                           |
| --------------------- | ---------------------------------------------- |
| `DATABASE_URL`        | Prisma 기본 DB 연결 문자열                     |
| `DIRECT_URL`          | Prisma 마이그레이션/직접 연결용 DB 연결 문자열 |
| `COOKIE_PASSWORD`     | iron-session 쿠키 암호화 키                    |
| `NEXT_PUBLIC_APP_URL` | 대표 URL, 인증 콜백, 공유 링크 기준 URL        |
| `CRON_SECRET`         | Vercel Cron 호출 인증용 시크릿 키              |

#### Supabase

| 변수명                            | 설명                  |
| --------------------------------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLIC_KEY` | Supabase 공개 anon 키 |

#### Auth / SMS / Email

| 변수명                  | 설명                             |
| ----------------------- | -------------------------------- |
| `KAKAO_CLIENT_ID`       | Kakao OAuth 클라이언트 ID        |
| `KAKAO_CLIENT_SECRET`   | Kakao OAuth 클라이언트 시크릿 키 |
| `KAKAO_REDIRECT_URI`    | Kakao OAuth 리다이렉트 URI       |
| `COOLSMS_API_KEY`       | CoolSMS API 키                   |
| `COOLSMS_API_SECRET`    | CoolSMS API 시크릿 키            |
| `COOLSMS_SENDER_NUMBER` | CoolSMS 발신 번호                |
| `RESEND_API_KEY`        | Resend 이메일 발송 API 키        |

#### Cloudflare

| 변수명                                 | 설명                                         |
| -------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH`  | Cloudflare Images 이미지 제공 해시           |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN` | Cloudflare Stream 재생 도메인                |
| `CLOUDFLARE_ACCOUNT_ID`                | Cloudflare 계정 ID                           |
| `CLOUDFLARE_API_TOKEN`                 | Cloudflare API 토큰                          |
| `CLOUDFLARE_WEBHOOK_SECRET`            | Cloudflare 웹훅 요청 검증용 시크릿 키        |
| `CLOUDFLARE_STREAM_WEBHOOK_SECRET`     | Cloudflare Stream 웹훅 서명 검증용 시크릿 키 |

#### Push / 지도

| 변수명                          | 설명                          |
| ------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | Web Push VAPID 공개키         |
| `VAPID_PRIVATE_KEY`             | Web Push VAPID 개인키         |
| `NEXT_PUBLIC_KAKAO_MAP_API_KEY` | 카카오 지도 JavaScript SDK 키 |

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
```
