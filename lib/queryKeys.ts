/**
 * File Name : lib/queryKeys.ts
 * Description : TanStack Query 캐시 키 중앙 관리 팩토리
 * Author : 임도헌
 *
 * 📋 [BoardPort 캐싱 정책 가이드]
 *
 * 1. Next.js fetch 캐시 (서버 사이드) - 현재 파일(cacheTags) 사용
 *   - 대상: 공통 콘텐츠 (모든 유저가 같은 데이터를 봄), 업데이트 빈도가 낮은 데이
 *   - 예시: 카테고리 목록, 뱃지 전체 목록, 게시글 상세(본문), 상품 상세(본문)
 *   - 효과: DB API 호출 비용 90% 이상 절감
 *
 * 2. TanStack Query (클라이언트 사이드) - queryKeys.ts 사용
 *   - 대상: 개인화 데이터 (유저별로 다른 데이터), 실시간 데이터
 *   - 예시: 내 동네/차단이 필터링된 상품 목록, 채팅방 목록, 알림 목록, 좋아요 상태
 *   - 효과: 탭 전환/뒤로가기 시 API 호출 0회 (즉각 반응)
 *
 * 3. 혼합 사용 (상세 페이지 패턴)
 *   - 상세 본문(공통)은 Next.js 캐시를 사용
 *   - 좋아요 여부, 내 댓글(개인화) 등은 TanStack Query 사용
 *   - 수정/삭제 Action 실행 시 `revalidateTag`와 `invalidateQueries`를 동시에 호출
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.28  임도헌   Created   Query Key Factory 패턴 도입으로 오타 방지 및 무효화 일관성 확보
 * 2026.03.03  임도헌   Modified  유저(User) 도메인 키 추가 (팔로우 통계 상태 관리용)
 * 2026.03.03  임도헌   Modified  채팅(Chat) 도메인 룸 목록 키 추가
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

/**
 * 전역 TanStack Query 캐시 키 관리 팩토리
 *
 * [캐시 제어 전략]
 * - 문자열 오타 방지 및 구조적 확장을 위한 Query Key Factory 패턴 도입
 * - 도메인(Product, Post, Chat, User 등) 및 개인화 속성(userId, scope 등)별 쿼리 키 계층화 적용
 * - Mutation 성공 시 연관된 쿼리를 일관성 있게 무효화(invalidateQueries)하기 위한 단일 진실 공급원(SSOT) 역할 수행
 */
export const queryKeys = {
  // 1. 상품(Product) 도메인
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.products.details(), id] as const,
    likeStatus: (productId: number) =>
      [...queryKeys.products.detail(productId), "likeStatus"] as const,
    // 유저 프로필 탭의 판매/구매 목록용
    userScope: (scope: string, userId: number) =>
      [...queryKeys.products.all, "userScope", scope, userId] as const,
  },

  // 2. 커뮤니티(Post) 도메인
  posts: {
    all: ["posts"] as const,
    lists: () => [...queryKeys.posts.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.posts.details(), id] as const,
    comments: (postId: number) =>
      [...queryKeys.posts.all, "comments", postId] as const,
    likeStatus: (postId: number) =>
      [...queryKeys.posts.detail(postId), "likeStatus"] as const,
  },

  // 3. 리뷰(Review) 도메인
  reviews: {
    all: ["reviews"] as const,
    user: (userId: number) =>
      [...queryKeys.reviews.all, "user", userId] as const,
  },

  // 4. 채팅(Chat) 도메인
  chats: {
    all: ["chats"] as const,
    lists: () => [...queryKeys.chats.all, "list"] as const,
    list: (userId: number) => [...queryKeys.chats.lists(), userId] as const,
    messages: (roomId: string) =>
      [...queryKeys.chats.all, "messages", roomId] as const,
  },

  // 5. 스트리밍(Stream) 도메인
  streams: {
    all: ["streams"] as const,
    lists: () => [...queryKeys.streams.all, "list"] as const,
    list: (scope: string, filters: Record<string, any>) =>
      [...queryKeys.streams.lists(), scope, filters] as const,
    vodComments: (vodId: number) =>
      [...queryKeys.streams.all, "vodComments", vodId] as const,
    likeStatus: (vodId: number) =>
      [...queryKeys.streams.all, "vod", vodId, "likeStatus"] as const,
  },

  // 6. 유저(User) 도메인
  users: {
    all: ["users"] as const,
    followStats: (userId: number) =>
      [...queryKeys.users.all, "followStats", userId] as const,
  },

  follows: {
    all: ["follows"] as const,
    user: (username: string) => [...queryKeys.follows.all, username] as const,
    list: (username: string, type: "followers" | "following") =>
      [...queryKeys.follows.user(username), type] as const,
  },

  search: {
    all: ["search"] as const,
    history: () => [...queryKeys.search.all, "history"] as const,
  },
};
