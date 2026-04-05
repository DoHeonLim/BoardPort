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
 * 2026.03.13  임도헌   Modified  프로필 진입 시 현재 경로를 returnTo로 함께 전달해 복귀 맥락 유지
 * 2026.03.14  임도헌   Modified  프로필 헤더용 반응형 size 프리셋을 추가해 JS matchMedia 없이 CSS만으로 크기 제어
 * 2026.03.18  임도헌   Modified  현재 보고 있는 동일 프로필에선 self-navigation을 막아 nested returnTo 누적 방지
 * 2026.03.19  임도헌   Modified  공용 아바타의 현재 경로도 내부 경로 기준으로 정규화해 raw returnTo 재전파를 방지
 * 2026.04.04  임도헌   Modified  props/export 주석을 보강해 공용 아바타의 링크/표시 정책을 더 명확히 정리
 */

"use client";

import { UserIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import TimeAgo from "../ui/TimeAgo";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatar?: string | null;
  username: string;
  /** 닉네임 라벨 표시 여부 */
  showUsername?: boolean;
  /** 공용 size 프리셋 */
  size?: "sm" | "md" | "lg" | "profile";
  created_at?: Date;
  disabled?: boolean;
  /** 닉네임 뒤에 붙는 보조 텍스트 */
  text?: string;
  className?: string;
  /** 채팅/리스트 등 초소형 배치용: 바깥 패딩 제거, 호버 제거 */
  compact?: boolean;
}

/**
 * 프로필 링크와 작성 시각 표시를 함께 처리하는 공용 유저 아바타 컴포넌트
 *
 * - 아바타/기본 아이콘 분기 렌더링
 * - 닉네임, 보조 텍스트, 작성 시각 표시
 * - 동일 프로필 self-navigation 차단 및 returnTo 누적 방지
 *
 * @param {UserAvatarProps} props - 아바타 표시 옵션과 프로필 링크 설정
 * @returns {JSX.Element} 유저 아바타와 메타 정보 묶음
 */
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profilePath = `/profile/${username}`;

  // CSS box size와 실제 이미지 요청 px를 맞춰서 흐림 방지
  const sizes = {
    sm: { box: "size-8", px: 32 },
    md: { box: "size-12", px: 48 },
    lg: { box: "size-20", px: 80 },
    profile: { box: "size-12 sm:size-20", px: 80 },
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

  // 현재 보고 있는 동일 프로필에선 self-navigation 대신 정적 렌더링
  if (disabled || pathname === profilePath) return root;

  const currentSearch = searchParams?.toString();
  // 공용 아바타도 현재 경로를 내부 경로 기준으로 정규화해 nested returnTo 재전파를 방지
  const returnTo = sanitizeCallbackUrl(
    `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
  );

  return (
    <Link
      href={`${profilePath}?returnTo=${encodeURIComponent(returnTo)}`}
      aria-label={`${username} 프로필`}
    >
      {root}
    </Link>
  );
}
