/**
 * File Name : features/user/hooks/useUserLite.ts
 * Description : userId로 최소 정보(id/username/avatar)만 SWR로 가져오는 클라이언트 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.22  임도헌   Created   /api/users/[id]/info 연동 훅 추가(낙관 삽입 시 정확한 표시용)
 * 2026.01.16  임도헌   Moved     hooks -> hooks/user
 * 2026.01.18  임도헌   Moved     hooks/user -> features/user/hooks
 */

"use client";

import useSWR from "swr";

export type UserLite = {
  id: number;
  username: string | null;
  avatar: string | null;
} | null;

const fetcher = (url: string) =>
  fetch(url, { credentials: "same-origin" }).then((r) => r.json());

/**
 * 특정 userId의 최소 정보만 불러오기
 * - enabled=false면 호출 안 함
 * - SWR 캐시로 중복 호출 방지
 */
export function useUserLite(userId?: number, enabled: boolean = true) {
  const key = enabled && userId ? `/api/users/${userId}/info` : null;

  const { data, isLoading, error, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const user: UserLite = data?.ok ? data.user : null;
  return { user, isLoading, error, mutate };
}
