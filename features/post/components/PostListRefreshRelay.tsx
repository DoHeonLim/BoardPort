/**
 * File Name : features/post/components/PostListRefreshRelay.tsx
 * Description : 게시글 목록 back 복귀 후 stale list를 1회만 새로고침하는 릴레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   게시글 상세 삭제 후 history back 복귀 시 목록 stale 상태를 1회 refresh로 보정
 * 2026.04.24  임도헌   Modified  같은 탭 sessionStorage 기반 router.refresh 트리거라는 역할이 드러나도록 주석 보강
 * 2026.04.24  임도헌   Modified  navigation refresh helper로 목록 refresh flag 소비 로직을 단순화
 * 2026.05.24  임도헌   Modified  삭제 후 /posts mixed tree 잔상을 지우기 위해 router.refresh 대신 문서 reload 사용
 */
"use client";

import { useEffect } from "react";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_ROOT_ID,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

/**
 * 게시글 목록 복귀 후 1회 refresh 릴레이
 *
 * [기능]
 * - 상세 삭제 후 `router.back()`으로 돌아온 게시글 목록이 stale 상태로 남지 않도록
 *   같은 탭 세션 플래그를 1회 소비해 현재 문서를 다시 로드
 * - URL은 `/posts`인데 삭제된 상세 segment가 위에 남는 App Router mixed tree 상태를 정리
 */
export default function PostListRefreshRelay() {
  useEffect(() => {
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.POSTS_LIST,
        NAVIGATION_REFRESH_ROOT_ID
      )
    ) {
      return;
    }
    // router.refresh()는 URL이 /posts여도 삭제된 상세 segment가 남는
    // mixed tree를 지우지 못해 문서 reload를 사용한다.
    window.location.reload();
  }, []);

  return null;
}
