/**
 * File Name : app/(tabs)/posts/actions/search
 * Description : 항해일지 페이지 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.06  임도헌   Created
 * 2025.05.06  임도헌   Modified  게시글 페이지 액션 추가
 * 2025.07.04  임도헌   Modified  게시글 검색 간소화
 * 2026.01.03  임도헌   Modified  검색 초기 로딩을 POST_LIST 태그 기반 캐시(init 공용)로 연결
 */
import { getInitialPostsBySearch } from "./init";
import { PostSearchParams } from "@/features/post/lib/queries";
import { Posts } from "@/types/post";

export const searchPosts = async (params: PostSearchParams): Promise<Posts> => {
  return getInitialPostsBySearch(params);
};
