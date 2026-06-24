/**
 * File Name : features/chat/components/chatRoomCard/ChatRoomHeader.tsx
 * Description : 채팅방 상대 유저 정보 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   유저 정보 컴포넌트 분리
 * 2025.07.24  임도헌   Modified  BoardPort 스타일 적용
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.27  임도헌   Modified  상품 중심 채팅 목록 위계에 맞춰 상대방 행을 보조 메타 톤으로 정리
 * 2026.04.10  임도헌   Modified  채팅 타이포 정책에 맞춰 상대방 이름 weight를 500 기준으로 정리
 * 2026.04.14  임도헌   Modified  채팅 목록 최적화 대응으로 카드 헤더 렌더 비용을 낮춤
 */
"use client";

import Image from "next/image";
import { UserIcon } from "@heroicons/react/24/solid";
import { ChatUser } from "@/features/chat/types";

interface ChatRoomHeaderProps {
  user: ChatUser;
}

/**
 * 채팅방 상대방 유저 이름 및 아바타
 */
export default function ChatRoomHeader({ user }: ChatRoomHeaderProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {user.avatar ? (
        <Image
          src={`${user.avatar}/public`}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full bg-surface object-cover ring-1 ring-border"
        />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-dim ring-1 ring-border">
          <UserIcon className="size-5 text-muted/50" />
        </div>
      )}
      <span className="truncate text-sm font-medium text-primary">
        {user.username}
      </span>
    </div>
  );
}
