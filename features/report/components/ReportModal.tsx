/**
 * File Name : features/report/components/ReportModal.tsx
 * Description : 모든 도메인 공용 신고 모달 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   라디오 버튼 기반 신고 사유 선택 및 제출 UI 구현
 * 2026.02.20  임도헌   Modified  레이아웃에서 모달 위치가 깨지지 않도록 createPortal 적용
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.06  임도헌   Modified  포커스 트랩/복귀와 닫기 버튼 접근성을 추가해 모달 a11y 기준을 맞춤
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.18  임도헌   Modified  비로그인 신고 진입용 현재 경로를 내부 경로 기준으로 정규화한 callbackUrl로 전달해 로그인 복귀와 nested callbackUrl 예외를 함께 완화
 * 2026.03.22  임도헌   Modified  최근 모달 톤 기준으로 외곽선과 헤더/푸터 보더 강도 정리
 * 2026.04.03  임도헌   Modified  신고 대상 타입 import를 report/types 공용 정의로 정리
 * 2026.04.06  임도헌   Modified  모바일 키보드가 열려도 textarea와 CTA가 안전하게 보이도록 시트형 배치와 내부 스크롤 구조 적용
 * 2026.04.10  임도헌   Modified  신고 사유 선택 라벨 weight를 Pretendard subset 3-weight 정책에 맞춰 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.06.19  임도헌   Modified  X 닫기와 중복되는 푸터 취소 버튼을 제거해 신고 제출 CTA 중심으로 정리
 * 2026.06.19  임도헌   Modified  모바일 신고 UI를 공용 BottomSheet로 분기해 차단/신고 모달 문법 통일
 * 2026.08.27  임도헌   Modified  데스크톱 포커스 트랩·초기/복귀 포커스를 공용 useModalFocus로 통일
 */

import {
  useState,
  useTransition,
  useEffect,
  useId,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { XMarkIcon } from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";
import { submitReportAction } from "@/features/report/actions/create";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalFocus } from "@/hooks/useModalFocus";
import {
  REPORT_REASON_LABELS,
  REPORT_ERRORS,
} from "@/features/report/constants";
import type { ReportTargetType } from "@/features/report/types";
import { ReportReason } from "@/generated/prisma/client";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: number;
  targetType: ReportTargetType;
}

/**
 * 신고 접수 모달
 * - 도메인 전반에서 공통으로 사용되는 신고 UI
 * - 사유 선택(Radio) 및 상세 내용 입력 후 제출 처리
 *
 * @param isOpen - 모달 열림 여부
 * @param onClose - 모달 닫기 핸들러
 * @param targetId - 신고 대상 ID
 * @param targetType - 신고 대상 타입
 */
export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
}: ReportModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isMobile = useIsMobile();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const currentSearch = searchParams?.toString();
  // 로그인 유도 callbackUrl도 현재 내부 경로 기준으로만 보존
  const currentPath = sanitizeCallbackUrl(
    `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
  );

  // SSR 환경 대응 (마운트 여부 확인)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRequestClose = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDescription("");
    } else if (!isMobile) {
      // 데스크톱 모달은 직접 관리하고, 모바일 스크롤/포커스는 공용 BottomSheet가 담당
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isMobile, isOpen]);

  useModalFocus({
    open: isOpen,
    enabled: mounted && !isMobile,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onClose: handleRequestClose,
  });

  if (!isOpen || !mounted) return null;

  const handleSubmit = () => {
    if (!reason) {
      toast.error("신고 사유를 선택해주세요.");
      return;
    }

    startTransition(async () => {
      const res = await submitReportAction({
        targetId,
        targetType,
        reason: reason as ReportReason,
        description,
      });

      if (res.success) {
        toast.success(
          "신고가 정상적으로 접수되었습니다. 깨끗한 바다를 만들어주셔서 감사합니다! ⚓"
        );
        onClose();
      } else if (res.error === REPORT_ERRORS.NOT_LOGGED_IN) {
        // 신고 맥락을 잃지 않도록 현재 경로를 로그인 callbackUrl로 전달
        onClose();
        router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error(res.error);
      }
    });
  };

  const reportForm = (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-sm font-bold text-primary mb-3 block">
          신고 사유
        </label>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
          {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((r) => (
            <label
              key={r}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-[background-color,color,border-color,box-shadow]",
                reason === r
                  ? "bg-brand/5 border-brand/50 text-brand dark:bg-brand-light/10 dark:border-brand-light/50 dark:text-brand-light"
                  : "bg-surface border-border text-muted hover:bg-surface-dim"
              )}
            >
              <input
                type="radio"
                name="report_reason"
                value={r}
                checked={reason === r}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="size-4 shrink-0 accent-brand dark:accent-brand-light"
                disabled={isPending}
              />
              <span className="text-sm font-medium">
                {REPORT_REASON_LABELS[r]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-primary mb-2 block">
          상세 설명{" "}
          <span className="font-normal text-muted text-xs">(선택)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="내용을 입력하세요..."
          className="input-primary min-h-[100px] p-4 text-sm bg-surface-dim border-none resize-none"
          maxLength={500}
          disabled={isPending}
        />
      </div>
    </div>
  );

  const submitButton = (
    <button
      onClick={handleSubmit}
      className="btn-primary h-11 px-8"
      disabled={isPending || !reason}
    >
      {isPending ? "접수 중..." : "신고하기"}
    </button>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open
        title="신고하기"
        onClose={handleRequestClose}
        contentClassName="px-4 py-5"
        footer={<div className="flex justify-end">{submitButton}</div>}
      >
        {reportForm}
      </BottomSheet>
    );
  }

  const modalContent = (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-4">
      {/* 배경 클릭 시 닫기 */}
      <div className="absolute inset-0" onClick={handleRequestClose} />

      <div
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-border-subtle bg-surface shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <p id={descriptionId} className="sr-only">
          신고 사유를 선택하고 필요한 경우 상세 설명을 입력한 뒤 제출합니다.
        </p>

        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface">
          <h2 id={titleId} className="font-bold text-primary text-lg">
            신고하기
          </h2>
          <button
            onClick={handleRequestClose}
            disabled={isPending}
            ref={closeButtonRef}
            aria-label="신고 모달 닫기"
            className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1 text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">{reportForm}</div>

        {/* 하단 액션 */}
        <div className="shrink-0 p-4 border-t border-border-subtle bg-surface flex justify-end">
          {submitButton}
        </div>
      </div>
    </div>
  );

  // createPortal 적용으로 z-index 충돌 방지
  return createPortal(modalContent, document.body);
}
