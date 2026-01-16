/**
 * File Name : components/profile/ReservationUserInfo
 * Description : 예약자 정보 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.04  임도헌   Created
 * 2024.12.04  임도헌   Modified  예약자 정보 컴포넌트 추가
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.22  임도헌   Modified  함수명 변경
 * 2025.11.02  임도헌   Modified  프리뷰(fallback) 옵션 추가
 * 2026.01.03  임도헌   Modified  예약자 정보 조회를 getUserInfo(id) → getUserInfoById(id)로 변경(세션 의존 제거)
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */
"use client";

import { useEffect, useState } from "react";
import UserAvatar from "../global/UserAvatar";
import { getUserInfoById } from "@/lib/user/getUserInfo";

export default function ReservationUserInfo({
  userId,
  fallback,
}: {
  userId: number | null;
  fallback?: { username: string; avatar: string | null } | null;
}) {
  const [user, setUser] = useState(fallback ?? null);

  useEffect(() => {
    if (!userId || user) return;
    let mounted = true;
    (async () => {
      const info = await getUserInfoById(userId);
      if (mounted && info) setUser(info);
    })();
    return () => {
      mounted = false;
    };
  }, [userId, user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-1.5 animate-fade-in">
      <UserAvatar
        avatar={user.avatar}
        username={user.username}
        size="sm"
        compact
      />
    </div>
  );
}
