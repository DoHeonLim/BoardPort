/**
 * File Name : features/stream/components/StreamChatPinnedNoticeEditor.tsx
 * Description : 스트림 채팅 상단 고정 공지 편집 패널
 * Author : 임도헌
 *
 * History
 * 2026.04.21  임도헌   Created   StreamChatRoom에서 고정 공지 편집 UI를 분리
 * 2026.04.26  임도헌   Modified  저장 CTA의 다크모드 색조를 primary CTA 톤과 맞춰 정리
 */
"use client";

import { STREAM_PINNED_NOTICE_MAX_LENGTH } from "@/features/stream/constants";

interface StreamChatPinnedNoticeEditorProps {
  draft: string;
  initialNotice: string | null;
  isSaving: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onClear: () => void;
  onSave: () => void;
}

/**
 * 호스트가 채팅 상단 고정 공지를 작성/수정하는 패널.
 */
export default function StreamChatPinnedNoticeEditor({
  draft,
  initialNotice,
  isSaving,
  onChange,
  onCancel,
  onClear,
  onSave,
}: StreamChatPinnedNoticeEditorProps) {
  return (
    <div className="shrink-0 border-b border-border-subtle bg-surface px-3 py-3 sm:px-4">
      <div className="rounded-2xl border border-border-subtle bg-surface-dim/50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">
              채팅 상단 고정 공지
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              방송 규칙, 참여 안내, 거래 주의사항처럼 모든 시청자에게 먼저
              보여줄 메시지를 고정
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted">
            {draft.trim().length}/{STREAM_PINNED_NOTICE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          value={draft}
          onChange={(event) => onChange(event.target.value)}
          maxLength={STREAM_PINNED_NOTICE_MAX_LENGTH}
          placeholder="예: 도배·욕설은 채팅 제한될 수 있습니다."
          className="mt-3 min-h-[96px] w-full resize-none rounded-2xl border border-border-subtle bg-background px-4 py-3 text-sm leading-6 text-primary placeholder:text-muted/90 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 dark:focus:border-brand-light/40 dark:focus:ring-brand-light/15"
        />
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring-soft rounded-full border border-border-subtle bg-background px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-dim"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={isSaving}
            className="focus-ring-soft rounded-full border border-border-subtle bg-background px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            공지 해제
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="focus-ring-strong rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
          >
            {isSaving ? "저장 중..." : initialNotice ? "저장" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
