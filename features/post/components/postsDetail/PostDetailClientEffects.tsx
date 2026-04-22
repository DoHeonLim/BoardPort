/**
 * File Name : features/post/components/postsDetail/PostDetailClientEffects.tsx
 * Description : 게시글 상세의 클라이언트 전용 복귀/새로고침 부작용 처리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.14  임도헌   Created   detail-edit 저장 후 back 복귀 시 1회 refresh와 상단 스크롤을 안정적으로 소비하는 클라이언트 island 분리
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  consumeNavigationRefreshFlag,
  createNavigationRefreshFlagKey,
} from "@/lib/navigationRefreshFlag";

interface PostDetailClientEffectsProps {
  postId: number;
}

/**
 * 게시글 상세에서 브라우저 복귀 문맥에 의존하는 부작용만 처리
 * back 복귀로 기존 상세 인스턴스가 복원되는 경우에도 세션 플래그를 소비해
 * 상단 스크롤과 1회 refresh를 안정적으로 수행하도록 별도 island로 분리했다.
 */
export default function PostDetailClientEffects({
  postId,
}: PostDetailClientEffectsProps) {
  const router = useRouter();

  useEffect(() => {
    const refreshKey = createNavigationRefreshFlagKey(
      "post-detail-refresh",
      postId
    );

    const consumeRefreshIfNeeded = () => {
      if (!consumeNavigationRefreshFlag(refreshKey)) return;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      router.refresh();
    };

    consumeRefreshIfNeeded();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      consumeRefreshIfNeeded();
    };

    window.addEventListener("pageshow", consumeRefreshIfNeeded);
    window.addEventListener("focus", consumeRefreshIfNeeded);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", consumeRefreshIfNeeded);
      window.removeEventListener("focus", consumeRefreshIfNeeded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [postId, router]);

  return null;
}
