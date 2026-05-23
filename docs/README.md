# BoardPort Docs

이 폴더에는 BoardPort를 만들면서 정리한 공개용 설계, 운영, 트러블슈팅 문서를 모아두었습니다.

면접이나 코드 리뷰에서 빠르게 흐름을 잡고 싶다면 아래 순서로 보는 편이 좋습니다.

## 추천 읽는 순서

1. [architecture/boardport-project-overview.md](./architecture/boardport-project-overview.md)
   - 프로젝트 목적, 핵심 도메인, 전체 아키텍처 요약

2. [architecture/case-study-state-management-modernization.md](./architecture/case-study-state-management-modernization.md)
   - Zustand와 TanStack Query를 도입하면서 Client State / Server State를 나눈 과정

3. [troubleshooting/troubleshooting-appointment-atomic-transition.md](./troubleshooting/troubleshooting-appointment-atomic-transition.md)
   - 채팅 약속 수락과 상품 예약 상태를 단일 트랜잭션으로 맞춘 사례

4. [troubleshooting/troubleshooting-pwa-web-push-routing.md](./troubleshooting/troubleshooting-pwa-web-push-routing.md)
   - In-App 알림과 Web Push 중복 제어, Service Worker 라우팅을 정리한 기록

5. [troubleshooting/troubleshooting-product-modal-routing.md](./troubleshooting/troubleshooting-product-modal-routing.md)
   - App Router Intercepting Route, 편집 복귀, 모달 히스토리 문제 해결 사례

## 문서 분류

### Architecture

- [프로젝트 개요](./architecture/boardport-project-overview.md)
- [상태 관리 아키텍처 현대화](./architecture/case-study-state-management-modernization.md)

### Design

- [UI/UX 디자인 기준](./design/boardport-uiux-design-standard.md)
- [보드게임 도감 데이터/화면 설계](./design/boardgame-catalog-design.md)
- [게시글 블록 콘텐츠 시스템 설계](./design/post-content-system-design.md)
- [관리자 ECharts 설계](./design/admin-echarts-design.md)

### Operations

- [보안 헤더 / CSP 운영 정책](./operations/security-headers-csp-policy.md)
- [보드게임 데이터 import 운영 기준](./operations/boardgame-data-import-runbook.md)
- [신고 처리와 제재 운영 정책](./operations/report-moderation-policy.md)

### Troubleshooting

- [제품 상세 모달/편집 라우팅](./troubleshooting/troubleshooting-product-modal-routing.md)
- [직거래 약속 수락과 상품 상태 원자적 전환](./troubleshooting/troubleshooting-appointment-atomic-transition.md)
- [PWA Web Push 중복 제어와 알림 라우팅](./troubleshooting/troubleshooting-pwa-web-push-routing.md)
- [게시글 동영상 Cloudflare 웹훅 상태 전환](./troubleshooting/troubleshooting-post-video-cloudflare-webhook.md)
- [소셜 공유 OG 이미지 라우트](./troubleshooting/troubleshooting-social-og-image-routes.md)
- [수정 복귀 / returnTo / refresh 플래그](./troubleshooting/troubleshooting-navigation-refresh-flag.md)
- [Lighthouse 보안 헤더 점검](./troubleshooting/troubleshooting-lighthouse-security-headers.md)

## 문서 배치 기준

- 큰 구조와 아키텍처 판단은 `architecture/`
- UI/UX 기준, 화면 정보 구조, 콘텐츠/시각화 설계는 `design/`
- 운영, 보안, 데이터 관리 기준은 `operations/`
- 실제로 겪은 문제와 해결 과정은 `troubleshooting/`
