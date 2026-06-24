/**
 * File Name : features/report/components/admin/ReportActionDialog.tsx
 * Description : 신고 처리 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 신고 처리 모달과 승인/기각 기본 흐름 추가
 * 2026.03.09  임도헌   Modified  승인 시 조치 유형/정지 기간/콘텐츠 삭제 옵션 추가
 * 2026.03.10  임도헌   Modified  누적 strike 표시, 권장 조치 기본값, 읽기 전용 처리 흐름을 주석에 반영
 * 2026.03.18  임도헌   Modified  처리 완료 신고 열람 시 권장 조치 입력 UI를 숨기고 실제 관리자 기록 중심으로 정리
 * 2026.03.23  임도헌   Modified  관리자 신고 처리 모달 셸과 요약 카드 보더를 구조선 기준으로 정리
 * 2026.03.30  임도헌   Modified  신고 대상 요약을 직접 대상·상위 문맥 2단 구조로 나누고 관련 화면 바로가기를 추가
 * 2026.04.03  임도헌   Modified  신고 처리 액션 타입 import를 report/types 공용 정의로 정리
 * 2026.04.06  임도헌   Modified  모바일 키보드가 열려도 처리 textarea와 하단 액션이 가려지지 않도록 시트형 배치 적용
 * 2026.04.10  임도헌   Modified  관리자 신고 처리 모달의 보조 라벨과 메타 텍스트를 400·500·700 정책에 맞춰 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.18  임도헌   Modified  내부 대상 링크 프리패치를 비활성화해 모달 진입 전 불필요한 선요청을 줄임
 * 2026.04.19  임도헌   Modified  관련 콘텐츠 삭제 체크박스에 공용 포커스 링을 적용해 관리자 폼 포커스 문법을 통일
 * 2026.04.26  임도헌   Modified  신고 처리 모달에 dialog 의미와 설명/폼 라벨 연결, ESC 닫기 흐름을 보강
 * 2026.04.27  임도헌   Modified  기각 사유 전달과 유저 단독 신고의 콘텐츠 삭제 추천 제외 흐름 보강
 * 2026.04.28  임도헌   Modified  모바일 신고 처리 UI를 공용 BottomSheet로 분기해 작은 화면의 잘림을 완화
 * 2026.04.28  임도헌   Modified  신고 처리 전 실제 조치 대상 유저를 모달에서 확인할 수 있도록 표시 보강
 * 2026.06.19  임도헌   Modified  데스크톱 X 닫기를 추가하고 푸터 취소/닫기 버튼을 제거해 처리 액션 중심으로 정리
 * 2026.06.19  임도헌   Modified  신고 처리 오버레이 레이어를 상향해 관리자 상단 영역까지 안정적으로 덮도록 보강
 * 2026.06.19  임도헌   Modified  데스크톱 신고 처리 모달을 포털로 렌더링해 관리자 셸의 레이아웃 문맥에서 분리
 */

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import BottomSheet from "@/components/global/BottomSheet";
import { updateReportAction } from "@/features/report/actions/admin";
import Select from "@/components/ui/Select";
import {
  REPORT_BAN_DURATIONS,
  REPORT_REASON_LABELS,
  REPORT_RESOLUTION_ACTION_DESCRIPTIONS,
  REPORT_RESOLUTION_ACTION_LABELS,
  REPORT_RESOLUTION_ACTIONS,
  getRecommendedResolution,
} from "@/features/report/constants";
import type { ReportReason } from "@/generated/prisma/client";
import type { ReportResolutionAction } from "@/features/report/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

interface ReportActionDialogProps {
  reportId: number;
  reportReason: ReportReason;
  currentStrikeTotal: number;
  reporterUsername?: string;
  reportDescription?: string | null;
  targetLabel?: string;
  targetId?: number;
  targetPreview?: string | null;
  targetParentLabel?: string | null;
  targetParentId?: number | null;
  targetParentPreview?: string | null;
  targetResolvedUserId?: number | null;
  targetResolvedUsername?: string | null;
  targetUrl?: string | null;
  targetParentUrl?: string | null;
  targetType?: string;
  reportStatus?: string;
  existingAdminComment?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (
    id: number,
    status: string,
    comment: string,
    strikeDelta: number
  ) => void;
}

/**
 * 신고 처리(조치) 다이얼로그
 *
 * [기능]
 * 1. 신고 사유, 누적 strike, 권장 조치를 읽고 승인/기각 판단을 내릴 수 있음
 * 2. 신고 원문과 신고 대상 요약을 직접 대상·상위 문맥 2단 구조로 표시
 * 3. 대상과 상위 문맥 화면으로 바로 이동해 실제 원본을 검토할 수 있음
 * 4. '조치 완료(승인)' 또는 '기각' 버튼으로 상태 변경 요청을 수행
 * 5. 댓글/리뷰/메시지처럼 간접 대상도 실제 조치 대상 유저를 함께 표시
 * 6. 모바일은 BottomSheet, 데스크톱은 중앙 모달로 분기
 * 7. 이미 처리된 신고는 권장 조치 입력 UI 없이 읽기 전용 기록으로 열람
 */
export default function ReportActionDialog({
  reportId,
  reportReason,
  currentStrikeTotal,
  reporterUsername,
  reportDescription,
  targetLabel,
  targetId,
  targetPreview,
  targetParentLabel,
  targetParentId,
  targetParentPreview,
  targetResolvedUserId,
  targetResolvedUsername,
  targetUrl,
  targetParentUrl,
  targetType,
  reportStatus = "PENDING",
  existingAdminComment,
  open,
  onClose,
  onSuccess,
}: ReportActionDialogProps) {
  // 유저 단독 신고는 삭제 가능한 직접 콘텐츠가 없으므로 삭제 조치를 추천/선택지에서 제외
  const supportsContentDeletion = targetType !== "USER";
  const recommended = useMemo(
    () => getRecommendedResolution(reportReason, currentStrikeTotal),
    [reportReason, currentStrikeTotal]
  );
  const effectiveRecommended = useMemo(() => {
    if (supportsContentDeletion) return recommended;

    return {
      ...recommended,
      action:
        recommended.action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT
          ? REPORT_RESOLUTION_ACTIONS.WARN
          : recommended.action,
      deleteContent: false,
    };
  }, [recommended, supportsContentDeletion]);
  const availableActions = useMemo(
    () =>
      Object.entries(REPORT_RESOLUTION_ACTION_LABELS).filter(
        ([value]) =>
          supportsContentDeletion ||
          value !== REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT
      ),
    [supportsContentDeletion]
  );
  const [comment, setComment] = useState("");
  const [action, setAction] = useState<ReportResolutionAction>(
    effectiveRecommended.action
  );
  const [durationDays, setDurationDays] = useState<number>(
    effectiveRecommended.durationDays ?? REPORT_BAN_DURATIONS.THREE_DAYS
  );
  const [deleteContent, setDeleteContent] = useState(
    effectiveRecommended.deleteContent
  );
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isReadOnly = reportStatus !== "PENDING";
  const [mounted, setMounted] = useState(false);

  const handleRequestClose = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setComment(existingAdminComment ?? "");
    setAction(effectiveRecommended.action);
    setDurationDays(
      effectiveRecommended.durationDays ?? REPORT_BAN_DURATIONS.THREE_DAYS
    );
    setDeleteContent(effectiveRecommended.deleteContent);
  }, [effectiveRecommended, existingAdminComment, open]);

  useEffect(() => {
    if (!open || isMobile) return;

    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleRequestClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRequestClose, isMobile, open]);

  if (!open || !mounted) return null;

  const handleAction = (status: "RESOLVED" | "DISMISSED") => {
    startTransition(async () => {
      const res = await updateReportAction(
        reportId,
        status,
        status === "RESOLVED"
          ? {
              action,
              adminComment: comment,
              strike:
                action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN
                  ? Math.max(effectiveRecommended.strike, 2)
                  : effectiveRecommended.strike,
              durationDays:
                action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN
                  ? durationDays
                  : action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN
                    ? REPORT_BAN_DURATIONS.PERMANENT
                    : undefined,
              deleteContent:
                action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT
                  ? true
                  : deleteContent,
            }
          : { adminComment: comment }
      );
      if (res.success) {
        toast.success(
          status === "RESOLVED"
            ? "신고를 승인(조치)했습니다."
            : "신고를 기각했습니다."
        );
        onSuccess(
          reportId,
          status,
          comment,
          status === "RESOLVED"
            ? action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN
              ? Math.max(effectiveRecommended.strike, 2)
              : effectiveRecommended.strike
            : 0
        );
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  };

  const dialogDescription = isReadOnly
    ? "이미 처리된 신고의 조치 내역입니다."
    : "조치 내용이나 기각 사유를 입력하세요.";

  const content = (
    <>
      <div className="mb-4 rounded-2xl border border-border-subtle bg-surface-dim/60 p-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-bold text-primary">
            신고 사유: {REPORT_REASON_LABELS[reportReason]}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-1 font-bold",
              currentStrikeTotal > 0
                ? "bg-danger/10 text-danger"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}
          >
            현재 누적 strike {currentStrikeTotal}회
          </span>
        </div>
        {!isReadOnly && (
          <>
            <div className="text-xs text-muted">
              권장 조치:{" "}
              <span className="font-bold text-primary">
                {REPORT_RESOLUTION_ACTION_LABELS[effectiveRecommended.action]}
              </span>
              {effectiveRecommended.action ===
                REPORT_RESOLUTION_ACTIONS.TEMP_BAN &&
                effectiveRecommended.durationDays && (
                  <span className="font-bold text-primary">
                    {" "}
                    / {effectiveRecommended.durationDays}일 정지
                  </span>
                )}
              <span className="ml-1">
                / 이번 strike {effectiveRecommended.strike}회
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {
                REPORT_RESOLUTION_ACTION_DESCRIPTIONS[
                  effectiveRecommended.action
                ]
              }
            </p>
          </>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-border-subtle bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-surface-dim px-2 py-1 font-bold text-primary">
            신고 #{reportId}
          </span>
          {reporterUsername ? (
            <span className="rounded-full bg-surface-dim px-2 py-1 font-medium text-muted">
              신고자 {reporterUsername}
            </span>
          ) : null}
        </div>

        {(targetLabel && targetId) || targetParentLabel ? (
          <div className="rounded-xl bg-surface-dim/40 px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              신고 대상
            </p>
            <div className="mt-3 space-y-3">
              {targetResolvedUserId ? (
                <div className="rounded-lg border border-border-subtle bg-surface/70 px-3 py-2">
                  <p className="text-xs font-bold text-muted">조치 대상 유저</p>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {targetResolvedUsername || "이름 없음"} #
                    {targetResolvedUserId}
                  </p>
                </div>
              ) : null}

              {targetLabel && targetId ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-muted">직접 대상</p>
                    {targetUrl ? (
                      <Link
                        href={targetUrl}
                        prefetch={false}
                        target={
                          targetUrl.startsWith("/admin") ? undefined : "_blank"
                        }
                        rel={
                          targetUrl.startsWith("/admin")
                            ? undefined
                            : "noopener noreferrer"
                        }
                        className="focus-ring-soft rounded px-1 py-0.5 text-xs font-bold text-brand hover:underline"
                      >
                        관련 화면 보기
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {targetLabel} #{targetId}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {targetPreview?.trim() || "대상 원문 요약이 없습니다."}
                  </p>
                </div>
              ) : null}

              {targetParentLabel && targetParentId ? (
                <div className="border-t border-border-subtle pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-muted">상위 문맥</p>
                    {targetParentUrl ? (
                      <Link
                        href={targetParentUrl}
                        prefetch={false}
                        target={
                          targetParentUrl.startsWith("/admin")
                            ? undefined
                            : "_blank"
                        }
                        rel={
                          targetParentUrl.startsWith("/admin")
                            ? undefined
                            : "noopener noreferrer"
                        }
                        className="focus-ring-soft rounded px-1 py-0.5 text-xs font-bold text-brand hover:underline"
                      >
                        원본 열기
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {targetParentLabel} #{targetParentId}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {targetParentPreview?.trim() ||
                      "상위 콘텐츠 요약이 없습니다."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl bg-surface-dim/40 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            신고 내용 원문
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-primary">
            {reportDescription?.trim() || "신고 설명이 입력되지 않았습니다."}
          </p>
        </div>
      </div>

      {!isReadOnly && (
        <div className="space-y-4 mb-4">
          <div>
            <label
              htmlFor="report-resolution-action"
              className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block"
            >
              승인 시 조치 유형
            </label>
            <Select
              id="report-resolution-action"
              value={action}
              onChange={(e) =>
                setAction(e.target.value as ReportResolutionAction)
              }
              disabled={isPending}
            >
              {availableActions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN && (
            <div>
              <label
                htmlFor="report-ban-duration"
                className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block"
              >
                정지 기간
              </label>
              <Select
                id="report-ban-duration"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                disabled={isPending}
              >
                <option value={3}>3일</option>
                <option value={7}>7일</option>
                <option value={30}>30일</option>
              </Select>
            </div>
          )}

          {supportsContentDeletion &&
            (action === REPORT_RESOLUTION_ACTIONS.TEMP_BAN ||
              action === REPORT_RESOLUTION_ACTIONS.PERMA_BAN) && (
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  checked={deleteContent}
                  onChange={(e) => setDeleteContent(e.target.checked)}
                  disabled={isPending}
                  className="focus-ring-soft size-4 shrink-0 rounded border-border accent-brand dark:accent-brand-light"
                />
                관련 콘텐츠도 함께 삭제
              </label>
            )}
        </div>
      )}

      <textarea
        aria-label={isReadOnly ? "관리자 기록" : "처리 내용"}
        className="input-primary w-full h-32 p-4 text-sm resize-none bg-surface-dim border-none"
        placeholder={isReadOnly ? "관리자 기록" : "처리 내용을 입력하세요..."}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isPending || isReadOnly}
      />
    </>
  );

  const footer = isReadOnly ? null : (
    <div className="flex justify-end gap-3">
      <button
        onClick={() => handleAction("DISMISSED")}
        disabled={isPending}
        className="focus-ring-soft inline-flex h-10 min-w-20 items-center justify-center rounded-xl border border-rose-300/50 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
      >
        기각
      </button>
      <button
        onClick={() => handleAction("RESOLVED")}
        disabled={isPending}
        className="btn-primary h-10 min-w-24 text-sm"
      >
        {isPending ? "처리 중..." : "조치 완료"}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open
        title="신고 처리"
        description={dialogDescription}
        onClose={handleRequestClose}
        footer={footer}
        contentClassName="pt-4"
        panelClassName="max-h-[92dvh]"
      >
        {content}
      </BottomSheet>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-action-title"
        aria-describedby="report-action-description"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                id="report-action-title"
                className="text-lg font-bold text-primary"
              >
                신고 처리
              </h3>
              <p
                id="report-action-description"
                className="mt-2 text-sm text-muted"
              >
                {dialogDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isPending}
              aria-label="신고 처리 모달 닫기"
              className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:opacity-50"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>
          {content}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border-subtle bg-surface px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
