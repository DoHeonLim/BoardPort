/**
 * File Name : features/product/components/ProductFormActions.tsx
 * Description : 제품 폼 하단 제출/리셋/취소 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ProductForm의 하단 CTA 묶음을 분리해 저장/취소 흐름을 명확화
 */

import Button from "@/components/ui/Button";

interface ProductFormActionsProps {
  mode: "create" | "edit";
  isUploading: boolean;
  onReset: () => void;
  onCancel: () => void;
}

/**
 * 제품 폼 하단 액션 섹션
 *
 * [역할]
 * - 저장 진행 상태 문구와 리셋/취소 CTA를 한 블록으로 관리
 * - create/edit 모드에 따른 버튼 라벨 차이를 폼 본문 밖에서 처리
 */
export default function ProductFormActions({
  mode,
  isUploading,
  onReset,
  onCancel,
}: ProductFormActionsProps) {
  return (
    <div className="flex flex-col gap-3 pt-4">
      <Button
        text={
          isUploading
            ? mode === "edit"
              ? "수정 중..."
              : "업로드 중..."
            : mode === "edit"
              ? "수정하기"
              : "등록하기"
        }
        disabled={isUploading}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onReset}
          className="focus-ring-soft h-12 rounded-xl border border-border bg-surface text-sm font-medium text-muted transition-colors hover:bg-surface-dim"
        >
          {mode === "edit" ? "원래 값으로 되돌리기" : "전체 초기화"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring-soft flex h-12 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-muted transition-colors hover:bg-surface-dim"
        >
          취소
        </button>
      </div>
    </div>
  );
}
