/**
 * File Name : components/stream/StreamListSection
 * Description : StreamList에 팔로우 CTA(onRequestFollow) 주입
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created   기본 버전
 * 2025.08.26  임도헌   Modified  useFollowToggle 사용
 * 2025.09.03  임도헌   Modified  onRequestFollow 누락 복구 및 중복 클릭 방지(pendingRef) 추가
 * 2025.09.06  임도헌   Modified  pendingRef 제거, isPending(userId) 사용, onRequireLogin 전달
 * 2025.09.10  임도헌   Modified  App Router(useRouter 교체), next 파라미터에 쿼리 보존
 * 2025.09.17  임도헌   Modified  viewerId null 가드
 */

"use client";

import StreamList from "@/components/stream/StreamList";
import { useFollowToggle } from "@/hooks/user/useFollowToggle";
import type { BroadcastSummary } from "@/types/stream";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// 이 파일에서만 쓰는 스코프 타입
type StreamScope = "all" | "following";

type Props = {
  scope: StreamScope;
  searchParams: { category?: string; keyword?: string };
  initialItems: BroadcastSummary[];
  initialCursor: number | null;
  viewerId?: number | null;
};

export default function StreamListSection(props: Props) {
  const { follow, isPending } = useFollowToggle();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 현재 경로 + 쿼리를 그대로 next에 보존
  const nextPath =
    pathname + (searchParams.size ? `?${searchParams.toString()}` : "");

  const handleRequestFollow = useCallback(
    async ({ id: userId }: { id: number; username?: string }) => {
      if (isPending(userId)) return; // 중복 클릭 방지

      await follow(userId, {
        viewerId: props.viewerId ?? null,
        // 미들웨어로 대부분 로그인 상태지만, 재사용을 위해 훅 옵션 유지
        onRequireLogin: () =>
          router.push(`/login?callbackUrl=${encodeURIComponent(nextPath)}`),
      });
    },
    [follow, isPending, nextPath, router, props.viewerId]
  );

  return (
    <StreamList
      {...props}
      onRequestFollow={handleRequestFollow}
      viewerId={props.viewerId ?? null}
    />
  );
}
