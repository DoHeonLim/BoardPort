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
 */
"use server";

import { getMorePosts as fetchMore } from "@/features/post/service/post";
import type { PostsPage } from "@/features/post/types";

/**
 * 무한 스크롤용 추가 게시글 로드 Action
 * - 클라이언트 컴포넌트(`PostList`)에서 다음 페이지 요청 시 호출됩니다.
 * - 검색어 및 카테고리 필터를 적용하여 조회합니다.
 *
 * @param {number | null} cursor - 마지막 게시글 ID
 * @param {Record<string, string>} searchParams - 검색 조건 (keyword, category)
 * @returns {Promise<PostsPage>} 다음 페이지 게시글 목록 및 커서
 */
export const getMorePosts = async (
  cursor: number | null,
  searchParams: Record<string, string>
): Promise<PostsPage> => {
  return fetchMore(cursor, {
    keyword: searchParams.keyword,
    category: searchParams.category,
  });
};
