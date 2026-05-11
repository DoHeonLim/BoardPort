/**
 * File Name : features/boardgame/components/admin/ImportProgressPanel.tsx
 * Description : 관리자 보드게임 CSV import 진행 상태 표시
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   보드게임 관리자 import 진행 상태 UI 분리
 */

export const IMPORT_PROGRESS_LABELS = {
  metadata: "원천 메타데이터 저장 중",
  locale: "한국어 검수 정보 반영 중",
  categories: "카테고리 연결 중",
  mechanics: "메커니즘 연결 중",
  taxonomy: "분류 한국어명 반영 중",
} as const;

export type ImportProgressKind = keyof typeof IMPORT_PROGRESS_LABELS;

export interface ImportProgressState {
  kind: ImportProgressKind;
  status: "running" | "success" | "error";
  message: string;
}

/**
 * CSV import 처리 상태 표시
 *
 * 실제 row 단위 처리율은 서버에서만 알 수 있으므로, 클라이언트에는 스피너와 현재 작업 상태만 표시
 *
 * @param props - 현재 import 처리 상태
 * @returns import 진행 상태 안내 패널
 */
export default function ImportProgressPanel({
  progress,
}: {
  progress: ImportProgressState;
}) {
  const statusText =
    progress.status === "running"
      ? "처리 중"
      : progress.status === "success"
        ? "완료"
        : "실패";

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-dim p-4"
      aria-live="polite"
      aria-busy={progress.status === "running"}
    >
      {progress.status === "running" ? (
        <span
          className="size-5 shrink-0 animate-spin rounded-full border-2 border-brand/25 border-t-brand"
          aria-hidden="true"
        />
      ) : (
        <span
          className={`size-2.5 shrink-0 rounded-full ${
            progress.status === "success" ? "bg-emerald-400" : "bg-red-500"
          }`}
          aria-hidden="true"
        />
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-primary">
          {progress.message} · {statusText}
        </p>
        <p className="mt-1 text-xs font-medium text-muted">
          {progress.status === "running"
            ? "서버에서 CSV를 검증하고 DB에 반영하는 중입니다."
            : "처리 결과를 확인했습니다."}
        </p>
      </div>
    </div>
  );
}
