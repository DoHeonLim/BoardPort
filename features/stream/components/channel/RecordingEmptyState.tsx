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
 * 2026.03.06  임도헌   Modified  Empty/Error 상태 공통 레이아웃 유틸과 CTA 높이 기준을 적용
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
    <div className="state-screen px-4 py-12">
      <div className="state-card max-w-sm px-5 py-7">
        <div className="state-icon-wrap mb-4 size-16">
          <VideoCameraSlashIcon className="size-8 text-muted/50" />
        </div>

        <h3 className="text-lg font-bold text-primary">아직 다시보기가 없어요</h3>
        <p className="state-description">
          방송이 끝나면 녹화본이 여기에 표시됩니다.
        </p>

        {role === "OWNER" ? (
          <div className="state-actions justify-center">
            <Link
              href="/streams/add"
              className="btn-primary inline-flex min-h-[44px] items-center justify-center px-6 text-sm"
            >
              첫 라이브 시작하기
            </Link>
          </div>
        ) : (
          showFollowButton && (
            <div className="state-actions justify-center">
              <button
                type="button"
                onClick={onFollow}
                className={cn(
                  "btn-primary inline-flex min-h-[44px] items-center justify-center px-6 text-sm",
                  !onFollow && "cursor-not-allowed opacity-50"
                )}
              >
                팔로우하고 새 방송 알림 받기
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
