/**
 * File Name : features/post/actions/list.ts
 * Description : 게시글 목록 조회 Controller (무한 스크롤)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.06  임도헌   Created
 * 2025.05.06  임도헌   Modified  게시글 페이지 액션 추가
 * 2025.06.26  임도헌   Created   게시글 초기 로딩 및 무한 스크롤 처리
 * 2025.07.04  임도헌   Modified  getMorePosts에 searchParams 추가
 * 2025.07.04  임도헌   Modified  전체 액션 커서 처리 통일
 * 2025-09-02  임도헌   Modified  TAKE 상수 POSTS_PAGE_TAKE로 변경
 * 2026.01.03  임도헌   Modified  posts 초기 1페이지/검색 결과를 POST_LIST 태그 기반 캐시로 전환(무효화 즉시 반영)
 * 2026.01.03  임도헌   Modified  getMorePosts는 비캐시 유지(커서/검색 조합 폭발 방지)
 * 2026.01.22  임도헌   Modified  Service 연결, Initial 제거
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/(tabs)/posts/actions/init.ts -> features/post/actions/list.ts
 * 2026.02.15  임도헌   Modified  searchParams 전달 로직 추가
 * 2026.03.04  임도헌   Modified  getPostsListAction으로 명칭 변경 및 페이징 조회 로직 통합 호출
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use server";

import { getPostsList } from "@/features/post/service/post";
import type { PostSearchParams, PostsPage } from "@/features/post/types";
import getSession from "@/lib/session";

/**
 * 게시글 목록 무한 스크롤 및 초기 로드 Server Action
 *
 * [데이터 페칭 전략 및 권한 로직]
 * - 클라이언트 `useSuspenseInfiniteQuery` 연동을 위한 데이터 페치 로직
 * - 검색 조건(키워드, 카테고리) 및 사용자 위치 설정(RegionRange) 기반 필터링 쿼리 적용
 * - 세션 검증을 통한 정지/차단 유저 콘텐츠 완벽 은닉 처리
 *
 * @param cursor - 무한 스크롤 커서 (마지막 게시글 ID)
 * @param searchParams - 검색 조건 파라미터
 */
export const getPostsListAction = async (
  cursor: number | null,
  searchParams: PostSearchParams
): Promise<PostsPage> => {
  const session = await getSession();
  const viewerId = session?.id ?? -1;

  return getPostsList(searchParams, viewerId, cursor);
};
