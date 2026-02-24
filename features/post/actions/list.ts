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
 */
"use server";

import { getMorePosts as fetchMore } from "@/features/post/service/post";
import type { PostSearchParams, PostsPage } from "@/features/post/types";
import getSession from "@/lib/session";

/**
 * 무한 스크롤용 추가 게시글 로드 Action
 * - 클라이언트 컴포넌트에서 다음 페이지 요청 시 호출
 * - 검색어, 카테고리, 지역 필터 등 검색 조건(searchParams)을 유지
 *
 * @param cursor - 마지막 게시글 ID
 * @param searchParams - 검색 조건 (keyword, category, region)
 */
export const getMorePosts = async (
  cursor: number | null,
  searchParams: PostSearchParams
): Promise<PostsPage> => {
  const session = await getSession();
  const viewerId = session?.id ?? -1;

  return fetchMore(
    cursor,
    searchParams, // 전체 params 전달 (Service에서 분해)
    viewerId
  );
};
