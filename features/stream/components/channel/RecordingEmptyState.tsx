/**
 * File Name : features/stream/components/channel/RecordingEmptyState.tsx
 * Description : 녹화본 없음 빈 상태 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.09  임도헌   Created   CTA 포함 빈 상태 카드
 * 2025.08.10  임도헌   Modified  팔로우 상태일 경우 CTA 버튼 숨김
 * 2026.01.14  임도헌   Modified  [UI] 공통 Empty State 스타일 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import Link from "next/link";
import { VideoCameraSlashIcon } from "@heroicons/react/24/outline";
import { ViewerRole } from "@/features/stream/types";
import { cn } from "@/lib/utils";

/**
 * 녹화본 목록이 비어있을 때 표시되는 UI
 * - 소유자(Owner)에게는 방송 시작 버튼을 노출
 * - 방문자(Visitor)에게는 팔로우 버튼을 노출
 */
export default function RecordingEmptyState({
  role,
  isFollowing,
  onFollow,
}: {
  role: ViewerRole;
  isFollowing?: boolean;
  onFollow?: () => void;
}) {
  const showFollowButton = role !== "OWNER" && isFollowing === false;

  return (
    <div className="flex flex-col items-center justify-center py-12 mx-4 text-center">
      <div className="p-4 rounded-full bg-surface-dim mb-4">
        <VideoCameraSlashIcon className="size-8 text-muted/50" />
      </div>

      <h3 className="text-base font-semibold text-primary mb-1">
        아직 다시보기가 없어요
      </h3>
      <p className="text-sm text-muted mb-6">
        방송이 끝나면 녹화본이 여기에 표시됩니다.
      </p>

      {role === "OWNER" ? (
        <Link
          href="/streams/add"
          className="btn-primary text-sm h-10 px-6 inline-flex items-center"
        >
          첫 라이브 시작하기
        </Link>
      ) : (
        showFollowButton && (
          <button
            type="button"
            onClick={onFollow}
            className={cn(
              "btn-primary text-sm h-10 px-6",
              !onFollow && "opacity-50 cursor-not-allowed"
            )}
          >
            팔로우하고 새 방송 알림 받기
          </button>
        )
      )}
    </div>
  );
}
