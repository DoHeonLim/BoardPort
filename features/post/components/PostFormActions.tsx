/**
 * File Name : features/post/components/PostFormActions.tsx
 * Description : 게시글 폼 하단 CTA 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   PostForm의 저장/리셋/취소 액션을 분리해 하단 흐름을 명확화
 */

import Button from "@/components/ui/Button";

interface PostFormActionsProps {
  isUploading: boolean;
  isEdit: boolean;
  isEditorLocked: boolean;
  isVideoUploading: boolean;
  submitLabel: string;
  onReset: () => void;
  onCancel: () => void;
}

/**
 * 게시글 폼 하단 액션 섹션
 *
 * [역할]
 * - 제출 버튼과 보조 액션(리셋/취소)을 한곳에서 렌더링
 * - 업로드 진행 상태, 수정/생성 모드, 동영상 처리 안내를 폼 본문 밖에서 관리
 */
export default function PostFormActions({
  isUploading,
  isEdit,
  isEditorLocked,
  isVideoUploading,
  submitLabel,
  onReset,
  onCancel,
}: PostFormActionsProps) {
  return (
    <div className="flex flex-col gap-2.5 pt-3 sm:gap-3 sm:pt-4">
      <Button
        text={
          isUploading ? (isEdit ? "수정 중..." : "업로드 중...") : submitLabel
        }
        disabled={isEditorLocked}
      />

      {isVideoUploading && (
        <p className="px-1 text-xs text-muted">
          동영상은 업로드/처리 중이어도 먼저 저장할 수 있으며, 상세에서 처리
          상태가 안내됩니다.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onReset}
          className="focus-ring-soft h-12 rounded-xl border border-border bg-surface text-sm font-medium text-muted transition-colors hover:bg-surface-dim"
          disabled={isEditorLocked}
        >
          {isEdit ? "원래 값으로 되돌리기" : "전체 초기화"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring-soft flex h-12 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-muted transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isUploading}
        >
          취소
        </button>
      </div>
    </div>
  );
}
