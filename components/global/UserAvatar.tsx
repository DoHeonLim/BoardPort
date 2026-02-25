/**
 * File Name : components/global/UserAvatar.tsx
 * Description : 유저 아바타 컴포넌트
 * Author : 임도헌
 *
 * History
 * 2024.12.07  임도헌   Created
 * 2024.12.07  임도헌   Modified  유저 아바타 컴포넌트 추가
 * 2024.12.16  임도헌   Modified  다크모드 적용
 * 2025.11.12  임도헌   Modified  className 지원 및 아바타 표시 조건/접근성 보강
 * 2025.11.16  임도헌   Modified  compact 옵션 + inline-flex/shrink-0, 빈 텍스트 래퍼 제거
 * 2025.12.12  임도헌   Modified  created_at 없을 때 빈 여백 제거, CSS size와 이미지 px 정합
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 (bg-surface 등)
 * 2026.01.16  임도헌   Moved     components/common -> components/global
 */

"use client";

import { UserIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import TimeAgo from "../ui/TimeAgo";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatar?: string | null;
  username: string;
  showUsername?: boolean;
  size?: "sm" | "md" | "lg";
  created_at?: Date;
  disabled?: boolean;
  text?: string;
  className?: string;
  /** 채팅/리스트 등 초소형 배치용: 바깥 패딩 제거, 호버 제거 */
  compact?: boolean;
}

export default function UserAvatar({
  avatar,
  username,
  showUsername = true,
  size = "sm",
  created_at,
  disabled = false,
  text,
  className,
  compact = false,
}: UserAvatarProps) {
  // CSS box size와 실제 이미지 요청 px를 맞춰서 흐림 방지
  const sizes = {
    sm: { box: "size-8", px: 32 },
    md: { box: "size-12", px: 48 },
    lg: { box: "size-20", px: 80 },
  } as const;

  const root = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md gap-2",
        !compact && "p-1.5 hover:bg-surface-dim transition-colors",
        className
      )}
    >
      {avatar ? (
        <Image
          width={sizes[size].px}
          height={sizes[size].px}
          className={cn(
            "rounded-full object-cover bg-surface",
            sizes[size].box,
            "ring-1 ring-border"
          )}
          src={`${avatar}/public`}
          alt={username}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-surface-dim ring-1 ring-border",
            sizes[size].box
          )}
        >
          <UserIcon className="size-3/5 text-muted/50" />
        </div>
      )}

      {(showUsername || text || created_at) && (
        <div className="flex flex-col min-w-0">
          {showUsername && (
            <div className="text-sm font-semibold text-primary truncate">
              {username}
              {text && (
                <span className="font-normal text-muted ml-1">{text}</span>
              )}
            </div>
          )}
          {created_at && <TimeAgo date={created_at} className="text-muted" />}
        </div>
      )}
    </div>
  );

  if (disabled) return root;

  return (
    <Link href={`/profile/${username}`} aria-label={`${username} 프로필`}>
      {root}
    </Link>
  );
}
