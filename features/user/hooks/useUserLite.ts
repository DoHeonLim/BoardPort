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
import { UserLite } from "@/features/user/types";

const fetcher = (url: string) =>
  fetch(url, { credentials: "same-origin" }).then((r) => r.json());

/**
 * 특정 유저의 최소 정보(ID, 이름, 아바타)를 비동기로 가져옵니다.
 * - 팔로워 리스트에 '나'를 낙관적으로 추가할 때 등,
 *   클라이언트가 유저 상세 정보를 가지고 있지 않을 때 유용합니다.
 *
 * @param userId - 조회할 유저 ID
 * @param enabled - 훅 활성화 여부
 */
export function useUserLite(userId?: number, enabled: boolean = true) {
  const key = enabled && userId ? `/api/users/${userId}/info` : null;

  const { data, isLoading, error, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const user: UserLite | null = data?.ok ? data.user : null;
  return { user, isLoading, error, mutate };
}
