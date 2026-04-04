/**
 * File Name : features/stream/components/RecordingListSection.tsx
 * Description : 다시보기 목록에 팔로우 CTA를 주입하는 권한 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.28  임도헌   Created   메인 다시보기 목록용 팔로우 래퍼 추가
 */
"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { useFollowToggle } from "@/features/user/hooks/useFollowToggle";
import RecordingList from "@/features/stream/components/RecordingList";

interface Props {
  sort: "latest" | "popular";
  followingOnly?: boolean;
  searchParams: {
    category?: string;
    keyword?: string;
    sort?: string;
    scope?: string;
  };
  viewerId?: number | null;
}

export default function RecordingListSection(props: Props) {
  const { toggle, isPending } = useFollowToggle();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextPath = sanitizeCallbackUrl(
    pathname + (searchParams.size ? `?${searchParams.toString()}` : "")
  );

  const handleRequestFollow = useCallback(
    async ({ id: userId }: { id: number; username?: string }) => {
      if (isPending(userId)) return;

      await toggle(userId, false, {
        viewerId: props.viewerId ?? null,
        onRequireLogin: () =>
          router.push(`/login?callbackUrl=${encodeURIComponent(nextPath)}`),
      });
    },
    [toggle, isPending, nextPath, router, props.viewerId]
  );

  return (
    <RecordingList
      {...props}
      onRequestFollow={handleRequestFollow}
      viewerId={props.viewerId ?? null}
    />
  );
}
