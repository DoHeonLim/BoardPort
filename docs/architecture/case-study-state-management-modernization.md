# 상태 관리 아키텍처 현대화

> BoardPort에서 Zustand와 TanStack Query를 도입하면서 Client State와 Server State의 책임을 다시 나눈 기록입니다.

## 1. 배경

초기 BoardPort는 도메인별 `useState`, 수동 배열 병합, `CustomEvent` 기반 전역 통신으로 상태를 관리했습니다.

기능이 늘어나면서 불편한 지점이 명확해졌습니다.

- 목록, 댓글, 리뷰, 다시보기 댓글에서 무한 스크롤 병합 로직이 반복됨
- 좋아요, 팔로우, 채팅방, 알림 수 변경 후 어떤 화면을 갱신해야 하는지 기준이 분산됨
- 모달과 알림 같은 UI 상태가 브라우저 이벤트에 의존해 변경 출처를 추적하기 어려움
- Next.js SSR 환경에서 전역 store singleton을 잘못 쓰면 요청 간 상태 공유 위험이 있음
- 상세 진입 후 뒤로가기를 했을 때 목록과 스크롤 맥락이 초기화되기 쉬움

전후 차이는 대략 이렇습니다.

| 영역                          | Before                                                 | After                                                | 개선 효과                                                       |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------- |
| 목록/댓글 페이징              | 도메인별 `useState`와 수동 배열 병합                   | `useInfiniteQuery` / `useSuspenseInfiniteQuery`      | 병합, 중복 제거, 로딩 상태 처리 반복 감소                       |
| 초기 데이터 전달              | `initial*` props와 클라이언트 로컬 상태 동기화         | Server Component prefetch + HydrationBoundary        | 서버에서 준비한 첫 페이지를 클라이언트 캐시로 전달              |
| 데이터 재검증                 | `revalidateTag`, `router.refresh`, 개별 refetch가 혼재 | queryKeys 기반 invalidate/refetch                    | mutation 후 갱신 범위 추적 용이                                 |
| 주요 목록의 클라이언트 재조회 | Client queryFn에서 조회용 Server Action 호출 가능성    | Route Handler fetch                                  | 초기 렌더 Server Function 호출 오류와 fetch waterfall 위험 감소 |
| 실시간 이벤트                 | 구독 위치마다 UI 갱신과 재조회 방식이 혼재             | 화면 성격에 따라 payload 즉시 반영 또는 query 재검증 | 메시지·알림의 즉시성과 DB 기준 상태 수렴을 함께 유지            |
| UI 전역 상태                  | `CustomEvent` 기반 모달/알림 열림 처리                 | Zustand Store Factory + Provider                     | 변경 출처 추적과 SSR 요청 간 격리 개선                          |

## 2. 분리 기준

상태의 저장 위치와 갱신 방식에 따라 다음 세 가지로 구분했습니다.

- **Client State:** 모달, 알림 UI, 테마처럼 서버에 저장되지 않는 UI 상태
- **Server State:** 목록, 상세, 댓글, 좋아요, 팔로우, 채팅방처럼 서버에서 오는 데이터
- **Realtime Event:** 채팅 메시지·알림은 payload를 즉시 반영하고, 채팅방 목록·미읽음 수·방송 상태는 query 재검증이나 refresh를 유도하는 이벤트

## 3. 개선한 구조

### 3.1 UI 상태는 Zustand Store Factory

모달과 알림 UI 상태는 Zustand로 옮겼습니다. 다만 SSR 환경에서 store를 module singleton처럼 공유하면 요청 간 상태가 섞일 수 있어, store factory와 provider 패턴을 함께 사용했습니다.

이때 둔 기준:

- module singleton store를 직접 공유하지 않음
- provider 내부에서 요청/트리 단위 store 생성
- selector 기반 훅으로 필요한 상태만 구독
- 목록·상세 같은 서버 데이터는 TanStack Query로 관리
- 알림 미읽음 수는 예외적으로 Zustand에서 표시용 상태를 유지하고, Realtime 수신 시 즉시 반영한 뒤 구독 시작·화면 복귀 시 서버 조회로 보정

관련 코드:

- `lib/store/notificationStore.ts`
- `lib/store/modalStore.ts`
- `components/global/providers/NotificationStoreProvider.tsx`
- `components/global/providers/ModalStoreProvider.tsx`

### 3.2 서버 상태는 TanStack Query

목록, 댓글, 리뷰, 다시보기 댓글은 TanStack Query의 `useInfiniteQuery` / `useSuspenseInfiniteQuery` 구조로 정리했습니다.

이후 달라진 점:

- 페이지별 캐시와 로딩·에러 상태는 Query로 관리하고, 화면용 목록 조합과 도메인별 보정은 각 훅에서 처리
- 뒤로가기 후에도 같은 query key의 목록 캐시를 재사용
- mutation 후 invalidate 기준을 queryKeys로 모음
- optimistic update와 rollback 위치를 명확하게 분리

### 3.3 Query Key Factory

캐시를 식별하는 키는 `lib/queryKeys.ts`에서 정의했습니다.

```ts
queryKeys.products.list(filters, viewerId);
queryKeys.posts.comments(postId, viewerId);
queryKeys.streams.vodComments(vodId, viewerId);
queryKeys.chats.unreadCount(userId);
```

이 구조 덕분에 서버 prefetch, 클라이언트 query, mutation invalidate가 같은 캐시 주소를 바라보게 됩니다.

## 4. App Router와 Data Fetching 정책

BoardPort는 App Router와 TanStack Query를 함께 쓰면서 조회와 변경의 실행 경로를 분리했습니다. 이 기준은 코드가 어느 정도 커진 뒤에야 필요성이 분명해졌습니다.

| 위치                                             | 기준                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Server Component 초기 데이터 준비                | service 계층 또는 조회용 Server Action을 서버에서 호출             |
| `prefetchQuery` / `prefetchInfiniteQuery`        | 서버에서 service 계층 또는 조회용 Server Action 호출               |
| 주요 자동 재조회 목록의 Client Component queryFn | Route Handler fetch                                                |
| 일부 세션 의존·기존 조회 queryFn                 | Server Action 유지                                                 |
| 생성/수정/삭제/토글                              | Server Action                                                      |
| Realtime 이벤트                                  | 화면 성격에 따라 payload 즉시 반영 또는 invalidate/refetch/refresh |

이 기준을 둔 이유는 Client Component의 queryFn이 렌더 중에도 실행되기 때문입니다. 실제 점검 과정에서 주요 목록의 조회용 Server Action을 직접 호출한 queryFn이 Next.js의 Server Function 초기 렌더 호출 오류를 만들었고, fetch waterfall 위험도 같이 남았습니다.

따라서 조회용 Server Action을 모두 제거한 것이 아니라, 자동 재조회가 잦은 주요 목록은 Route Handler fetch로 분리했습니다. 채팅 메시지, 리뷰, 팔로우, 검색 기록처럼 일부 세션 의존·기존 조회와 사용자의 명시적 변경 작업은 Server Action을 유지했습니다.

참고한 공식 문서:

- [Next.js Data Fetching](https://nextjs.org/docs/14/app/building-your-application/data-fetching/fetching-caching-and-revalidating)
- [React `use server`](https://react.dev/reference/rsc/use-server)

## 5. 예시 흐름

### 상품 목록

1. 서버에서 첫 페이지를 prefetch
2. HydrationBoundary로 클라이언트에 캐시 전달
3. 클라이언트는 같은 query key로 무한 스크롤 이어받기
4. 좋아요/상태 변경 후 관련 query invalidate

### 채팅 미읽음 수

1. TabBar는 직접 Realtime을 구독하지 않고 query 상태만 표시
2. 앱 전역 `ChatRoomsRealtimeBridge`가 채팅방 이벤트를 감지
3. 채팅방 목록과 미읽음 수 query를 invalidate/refetch
4. 채팅방 진입/읽음 처리 후 서버 기준 미읽음 수로 동기화

### 채팅 메시지와 알림

1. 채팅 메시지는 Realtime payload를 Query Cache에 즉시 반영
2. 알림은 payload로 Zustand 카운트와 토스트를 즉시 갱신
3. 목록·미읽음 수처럼 집계가 필요한 데이터는 별도 query 재검증으로 보정

### 방송 상태

1. 방송 상세 셸에서 live-status를 한 번만 구독
2. `stream:status` private 채널의 payload에서 내부 방송 ID만 확인하고 `router.refresh()`로 서버 상태를 재검증
3. 하위 컴포넌트는 Supabase를 직접 보지 않고 props만 받아 구독 수와 상태 분산을 줄임

## 6. 개선 효과

| 개선 지점                            | 개선 효과                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| 공통 페이징 hook과 Query Cache 사용  | 상품, 게시글, 방송, 댓글마다 반복하던 로딩/커서/병합 로직을 줄임                       |
| Query Key Factory 도입               | mutation 이후 갱신해야 할 캐시를 문자열 추적이 아니라 도메인별 key 구조로 추적         |
| HydrationBoundary 적용               | 첫 화면 데이터와 클라이언트 무한 스크롤이 같은 캐시를 사용해 불필요한 상태 복제를 줄임 |
| 주요 목록의 Route Handler fetch 분리 | 자동 재조회가 잦은 목록의 HTTP API 경계를 명확히 하고 초기 렌더 오류 위험을 줄임       |
| Realtime bridge 단일화               | 탭바, 채팅 목록, 알림처럼 여러 컴포넌트가 같은 채널을 중복 구독하는 상황을 줄임        |

## 7. 트레이드오프

- Route Handler가 늘어나 API 표면이 조금 커짐
- queryKeys 설계를 잘못하면 invalidate 범위가 과하거나 부족할 수 있음
- optimistic update는 사용성이 좋아지지만 rollback 설계가 필요함
- Server Component prefetch와 Client queryFn이 같은 shape를 유지해야 함

## 8. 정리

UI 상태는 Zustand에, 서버 데이터는 TanStack Query에 모았습니다. 알림 미읽음 수는 표시용 상태를 Zustand에 유지하되 서버 조회로 보정합니다. 새 조회나 변경 기능을 추가할 때는 캐시 키와 갱신 대상을 함께 정의합니다.

## 9. 관련 문서

- [프로젝트 개요](./boardport-project-overview.md)
- [PWA Web Push 중복 제어와 알림 라우팅](../troubleshooting/troubleshooting-pwa-web-push-routing.md)
- [제품 상세 모달/편집 라우팅](../troubleshooting/troubleshooting-product-modal-routing.md)
