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
 * 2026.03.21  임도헌   Modified  데스크톱에서도 모바일 카드처럼 보이지 않도록 다시보기 빈 상태를 섹션 폭 전체 패널로 확장
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
    <section className="mx-auto w-full max-w-3xl px-4 py-5 sm:py-6">
      <div className="mb-3 sm:mb-4">
        <h2 className="text-lg font-bold text-primary">다시보기</h2>
        <p className="mt-1 text-sm text-muted">
          지난 방송 기록은 이곳에서 다시 확인할 수 있습니다.
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface px-4 py-8 shadow-sm sm:px-8 sm:py-12">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="state-icon-wrap mb-3 size-14 sm:mb-4 sm:size-16">
            <VideoCameraSlashIcon className="size-7 text-muted/50 sm:size-8" />
          </div>

          <h3 className="text-lg font-bold text-primary">
            아직 다시보기가 없어요
          </h3>
          <p className="state-description mt-2">
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
                  disabled={!onFollow}
                  aria-disabled={!onFollow}
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
    </section>
  );
}
