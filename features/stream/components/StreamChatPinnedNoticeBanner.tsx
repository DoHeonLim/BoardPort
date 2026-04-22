/**
 * File Name : features/stream/components/StreamChatPinnedNoticeBanner.tsx
 * Description : 스트림 채팅 상단 고정 공지 배너
 * Author : 임도헌
 *
 * History
 * 2026.04.21  임도헌   Created   StreamChatRoom에서 고정 공지 표시 영역을 분리
 */
"use client";

import { MegaphoneIcon } from "@heroicons/react/24/outline";

interface StreamChatPinnedNoticeBannerProps {
  notice: string;
  isViewerHost: boolean;
  isSaving: boolean;
  isExpanded: boolean;
  shouldCollapse: boolean;
  collapsedNotice: string;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onClear: () => void;
}

/**
 * 현재 고정된 공지를 읽기 모드로 보여주는 배너.
 */
export default function StreamChatPinnedNoticeBanner({
  notice,
  isViewerHost,
  isSaving,
  isExpanded,
  shouldCollapse,
  collapsedNotice,
  onToggleExpanded,
  onEdit,
  onClear,
}: StreamChatPinnedNoticeBannerProps) {
  return (
    <div className="shrink-0 border-b border-border-subtle bg-amber-50/70 px-3 py-2.5 dark:bg-amber-950/15 sm:px-4">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <MegaphoneIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium tracking-[0.12em] text-amber-700 dark:text-amber-300">
              HOST NOTICE
            </p>
            {shouldCollapse && (
              <button
                type="button"
                onClick={onToggleExpanded}
                className="focus-ring-soft rounded px-1 text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
              >
                {isExpanded ? "접기" : "더보기"}
              </button>
            )}
            {isViewerHost && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="focus-ring-soft rounded px-1 text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  disabled={isSaving}
                  className="focus-ring-soft rounded px-1 text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                >
                  해제
                </button>
              </>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-primary">
            {shouldCollapse && !isExpanded
              ? `${collapsedNotice}${notice.length > collapsedNotice.length ? "..." : ""}`
              : notice}
          </p>
        </div>
      </div>
    </div>
  );
}
