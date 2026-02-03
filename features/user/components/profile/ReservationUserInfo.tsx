/**
 * File Name : features/user/components/profile/ReservationUserInfo.tsx
 * Description : 예약자 정보 표시 컴포넌트
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
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import { useEffect, useState } from "react";
import { getUserInfoAction } from "@/features/user/actions/profile";
import UserAvatar from "@/components/global/UserAvatar";

/**
 * 예약자 정보 표시 컴포넌트
 *
 * [기능]
 * 1. `fallback` 데이터가 있으면 즉시 표시합니다.
 * 2. `fallback`이 없고 `userId`만 있다면, 클라이언트에서 비동기로 유저 정보를 로드하여 표시합니다.
 * 3. 판매 내역 리스트에서 '예약 중' 상태일 때 예약자 정보를 보여주는 용도로 사용됩니다.
 */
export default function ReservationUserInfo({
  userId,
  fallback,
}: {
  userId: number | null;
  fallback?: { username: string; avatar: string | null } | null;
}) {
  const [user, setUser] = useState(fallback ?? null);

  useEffect(() => {
    // 이미 데이터가 있거나 userId가 없으면 스킵
    if (!userId || user) return;

    let mounted = true;

    // 비동기 데이터 로딩
    (async () => {
      const info = await getUserInfoAction(userId);
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
