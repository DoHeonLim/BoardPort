/**
 * File Name : features/stream/components/RecordingListSection.tsx
 * Description : 다시보기 목록에 팔로우 CTA를 주입하는 권한 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.28  임도헌   Created   메인 다시보기 목록용 팔로우 래퍼 추가
 * 2026.04.08  임도헌   Modified  팔로워 전용 다시보기 CTA 팔로우 성공 시 잠금 해제 안내 토스트 추가
 */
"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
    async ({ id: userId, username }: { id: number; username?: string }) => {
      if (isPending(userId)) return;

      const res = await toggle(userId, false, {
        viewerId: props.viewerId ?? null,
        onRequireLogin: () =>
          router.push(`/login?callbackUrl=${encodeURIComponent(nextPath)}`),
      });

      if (res?.success && res.isFollowing) {
        toast.success(
          username
            ? `${username}님을 팔로우했습니다. 이제 팔로워 전용 방송을 볼 수 있어요.`
            : "팔로우했습니다. 이제 팔로워 전용 방송을 볼 수 있어요."
        );
      }
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
