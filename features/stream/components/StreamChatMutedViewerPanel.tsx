/**
 * File Name : features/stream/components/StreamChatMutedViewerPanel.tsx
 * Description : 스트림 채팅 금지 대상 관리 패널
 * Author : 임도헌
 *
 * History
 * 2026.04.21  임도헌   Created   StreamChatRoom에서 채팅 금지 관리 패널을 분리
 * 2026.04.21  임도헌   Modified  데스크톱 인라인 패널에서도 긴 목록을 내부 스크롤로 끝까지 확인 가능하도록 보강
 */

import UserAvatar from "@/components/global/UserAvatar";
import type { MutedStreamViewer } from "@/features/stream/types";

interface StreamChatMutedViewerPanelProps {
  mutedViewers: MutedStreamViewer[];
  isRefreshing: boolean;
  onUnmute: (viewer: MutedStreamViewer) => void;
}

/**
 * 호스트 전용 채팅 금지 관리 목록.
 * 데스크톱 인라인 패널과 모바일 BottomSheet가 동일한 UI를 재사용
 */
export default function StreamChatMutedViewerPanel({
  mutedViewers,
  isRefreshing,
  onUnmute,
}: StreamChatMutedViewerPanelProps) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-dim/50 p-3 sm:flex sm:max-h-[min(52dvh,32rem)] sm:flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">채팅 금지 관리</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            현재 방송에서 채팅이 제한된 시청자를 보고, 필요할 때 바로 해제
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border-subtle bg-background px-2.5 py-1 text-xs font-medium text-muted">
          {mutedViewers.length}명
        </span>
      </div>
      <div className="mt-3 space-y-2 sm:flex-1 sm:overflow-y-auto sm:pr-1">
        {isRefreshing ? (
          <div className="rounded-2xl border border-border-subtle bg-background px-4 py-3 text-sm text-muted">
            채팅 금지 대상을 불러오는 중입니다.
          </div>
        ) : mutedViewers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-background px-4 py-3 text-sm text-muted">
            현재 채팅 금지된 시청자가 없습니다.
          </div>
        ) : (
          mutedViewers.map((viewer) => (
            <div
              key={viewer.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-background px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <UserAvatar
                  avatar={viewer.avatar}
                  username={viewer.username}
                  size="sm"
                  compact
                />
                <p className="mt-1 pl-10 text-xs leading-5 text-muted">
                  현재 방송에서는 메시지를 보낼 수 없는 상태
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUnmute(viewer)}
                className="focus-ring-soft shrink-0 rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface-dim"
              >
                해제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
