/**
 * File Name : features/stream/components/RTMPInfoModal.tsx
 * Description : 스트리밍 생성 완료 후 RTMP URL과 스트림 키 정보를 보여주는 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   RTMP 정보 모달 컴포넌트 분리
 * 2025.08.19  임도헌   Modified  복사 버튼/키 마스킹/보기 토글/접근성(ESC+TabTrap)/보안 경고/prop명 정리(rtmpUrl, streamKey)
 * 2025.08.19  임도헌   Modified  이동 버튼 복구(useRouter push), 키 재발급 기능/토스트(sonner) 및 버튼 색상/라벨 프로젝트 스타일 적용
 * 2025.09.09  임도헌   Modified  ConfirmDialog 연동 보강(ESC/백드롭 클릭 시 닫기), 포커스 트랩/바디 스크롤 잠금/오버레이 추가
 * 2025.09.22  임도헌   Modified  createdNewLiveInput 분기 제거, 삭제는 명시적 버튼 클릭 시에만 확인창 오픈
 * 2025.09.25  임도헌   Modified  복사버튼 클릭시 토스트 메세지 추가
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.06  임도헌   Modified  닫기/보기/재발급 버튼 접근성 및 포커스 복귀 보강
 * 2026.03.07  임도헌   Modified  사용자 피드백 문구를 v1.2 기준으로 구체화
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 ConfirmDialog와 중첩되어도 스크롤 잠금/복구 안정화
 * 2026.03.19  임도헌   Modified  모바일 우선 액션 밀도와 하단 우선순위를 재정리해 RTMP 정보 확인 흐름 개선
 * 2026.03.21  임도헌   Modified  닫기 액션의 방송 취소 의미를 더 명확히 하고 스트림 키 복사 가드를 현재 동작에 맞게 정리
 * 2026.03.21  임도헌   Modified  닫기(X/ESC/백드롭)는 즉시 취소하지 않고 확인 다이얼로그를 거치도록 분리
 * 2026.03.24  임도헌   Modified  중첩 확인 모달 루프를 차단하고 주요 CTA/취소 라벨 및 대비를 최종 정리
 * 2026.03.24  임도헌   Modified  닫기/생성 취소 액션 문구를 더 쉬운 사용자 표현으로 구체화
 * 2026.03.24  임도헌   Modified  사용자 혼란을 줄이기 위해 RTMP 모달에서는 송출 정보 삭제 UI를 제거하고 재발급 중심 흐름으로 정리
 * 2026.03.24  임도헌   Modified  iPhone SE급 작은 화면에서도 모달이 잘리지 않도록 상단 정렬/내부 스크롤과 모바일 간격을 보정
 * 2026.03.27  임도헌   Modified  생성 완료 후 상세 이동은 replace + returnTo=/streams로 통일해 뒤로가기가 생성 폼으로 복귀하지 않도록 정리
 * 2026.04.07  임도헌   Modified  모바일에서는 BottomSheet를 사용해 송출 정보 확인 흐름을 하단 시트로 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 주요 CTA weight를 500 기준으로 정리
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BottomSheet from "@/components/global/BottomSheet";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { deleteBroadcastAction } from "@/features/stream/actions/delete";
import { rotateLiveInputKeyAction } from "@/features/stream/actions/key";
import { useIsMobile } from "@/hooks/useIsMobile";

interface RTMPInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rtmpUrl: string;
  streamKey: string;
  liveInputId: number;
  broadcastId?: number;
}

/**
 * OBS 설정 정보(RTMP URL, Stream Key)를 표시하는 모달
 *
 * [기능]
 * 1. RTMP URL 및 스트림 키 복사 기능
 * 2. 스트림 키 재발급(Rotate) 기능
 * 3. 방송 페이지로 이동하지 않고 모달을 닫으면 생성된 방송을 취소(삭제)하는 로직 포함
 *
 * [표현]
 * - RTMP URL과 스트림 키는 모바일 우선 세로 흐름으로 배치
 * - 하단은 이동/닫기만 남기고, 보안 대응은 키 재발급으로 안내해 핵심 흐름을 단순하게 유지
 * - 생성 직후 닫기 동작이 "방송 취소"를 뜻하는 경우 안내 문구와 버튼 라벨로 의미를 더 분명하게 노출
 */
export default function RTMPInfoModal({
  open,
  onOpenChange,
  rtmpUrl,
  streamKey,
  liveInputId,
  broadcastId,
}: RTMPInfoModalProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  // 패널 참조 (포커스 트랩 등에서 사용)
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 트래킹: 사용자가 "스트리밍 페이지로 이동"을 눌러 네비게이션 했는지 여부
  // 네비게이션했으면 닫기 시 브로드캐스트 삭제를 수행하지 않음
  const navigatedToBroadcastRef = useRef(false);

  // 표시용 상태(재발급 후 최신값 갱신)
  const [rtmpUrlState, setRtmpUrlState] = useState(rtmpUrl);
  const [streamKeyState, setStreamKeyState] = useState(streamKey);
  useEffect(() => {
    setRtmpUrlState(rtmpUrl);
    setStreamKeyState(streamKey);
  }, [rtmpUrl, streamKey]);

  const [showKey, setShowKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [isRotating, startRotate] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setCloseConfirmOpen(false);
    }
  }, [open]);

  // 스트림 키 마스킹 (길이 고정 느낌 유지)
  const maskedKey = useMemo(() => {
    const len = Math.max(streamKeyState?.length || 0, 12);
    return "•".repeat(len);
  }, [streamKeyState]);

  // 열릴 때 첫 포커스 + 바디 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    if (isMobile) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => firstFocusRef.current?.focus(), 0);
    lockBodyScroll();
    return () => {
      clearTimeout(t);
      unlockBodyScroll();
      previousFocusRef.current?.focus?.();
    };
  }, [open, isMobile]);

  // ESC / Tab Trap -> Escape는 닫기 확인 로직(requestClose)으로 연결
  useEffect(() => {
    if (!open) return;
    if (isMobile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
      }
      // 간단 포커스 트랩
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, details,[tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter(
          (el) => !el.hasAttribute("disabled")
        );
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile]);

  const copy = async (text: string, which: "url" | "key") => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "url") {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 1500);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 1500);
      }
      toast.success("클립보드에 복사되었습니다.");
    } catch {
      toast.error(
        "클립보드 복사에 실패했습니다. 브라우저 권한을 확인한 뒤 다시 시도해주세요."
      );
    }
  };

  const handleRotate = () => {
    startRotate(async () => {
      try {
        const res = await rotateLiveInputKeyAction(liveInputId);

        if (res.success) {
          // 성공 타입으로 좁혀짐 (rtmpUrl, streamKey 존재)
          setRtmpUrlState(res.rtmpUrl);
          setStreamKeyState(res.streamKey);
          setShowKey(true);
          toast.success("스트림 키가 재발급되었습니다.");
        } else {
          // 실패 타입 (error 존재)
          toast.error(
            res.error ??
              "스트림 키 재발급에 실패했습니다. 잠시 후 다시 시도해주세요."
          );
        }
      } catch {
        toast.error(
          "스트림 키 재발급 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
        );
      }
    });
  };

  // 실제 취소 수행: 사용자가 방송 페이지로 이동하지 않았다면 생성된 방송을 취소
  const handleClose = () => {
    if (isDeleting) return;

    setCloseConfirmOpen(false);

    // 만약 네비게이트 했으면 즉시 닫기
    if (navigatedToBroadcastRef.current || !broadcastId) {
      onOpenChange(false);
      return;
    }

    // broadcastId가 있고 네비게이션 하지 않았다면 삭제 시도
    startDelete(async () => {
      try {
        const res = await deleteBroadcastAction(broadcastId!);
        if (res?.success) {
          toast.success("생성된 방송이 취소되었습니다.");
          // 캐시 무효화 등은 서버 action 내부에서 처리됨
        } else {
          toast.error(
            res?.error ??
              "생성된 방송 취소에 실패했습니다. 잠시 후 다시 시도해주세요."
          );
        }
      } catch {
        toast.error(
          "방송 취소 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
        );
      } finally {
        onOpenChange(false);
      }
    });
  };

  // 닫기 의도는 항상 먼저 이 함수로 모아, 파괴적 취소 여부를 확인
  const requestClose = () => {
    if (isDeleting) return;
    if (closeConfirmOpen) return;

    if (navigatedToBroadcastRef.current || !broadcastId) {
      onOpenChange(false);
      return;
    }

    setCloseConfirmOpen(true);
  };

  if (!open) return null;

  const closingCancelsBroadcast = !!broadcastId;
  const hasNestedConfirmOpen = closeConfirmOpen;
  const handleMoveToBroadcast = () => {
    if (!broadcastId) return;
    navigatedToBroadcastRef.current = true;
    setCloseConfirmOpen(false);
    onOpenChange(false);
    router.replace(
      `/streams/${broadcastId}?returnTo=${encodeURIComponent("/streams")}`
    );
  };

  const content = (
    <>
      <p className="mb-4 text-sm leading-6 text-muted sm:mb-6">
        아래 정보를 OBS 등 방송 소프트웨어에 입력하세요.{" "}
        <span className="font-medium text-danger">
          스트림 키는 절대 공유하지 마세요.
        </span>
      </p>

      <div className="mb-4 space-y-2 sm:mb-5">
        <label className="text-sm font-medium text-primary">RTMP URL</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 break-all rounded-xl border border-border bg-surface-dim px-4 py-3 text-sm font-mono text-primary">
            {rtmpUrlState}
          </code>
          <button
            type="button"
            ref={firstFocusRef}
            onClick={() => copy(rtmpUrlState, "url")}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary transition-colors",
              "hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0"
            )}
          >
            {copiedUrl ? (
              <span className="flex items-center gap-1 text-brand dark:text-brand-light">
                <CheckIcon className="size-4" /> 복사됨
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ClipboardIcon className="size-4" /> 복사
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-primary">스트림 키</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-dim px-4 py-3">
            <code className="flex-1 break-all text-sm font-mono text-primary">
              {showKey ? streamKeyState : maskedKey}
            </code>
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "스트림 키 숨기기" : "스트림 키 보기"}
              className="focus-ring-soft inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-primary"
              title={showKey ? "숨기기" : "보기"}
            >
              {showKey ? (
                <EyeSlashIcon className="size-5" />
              ) : (
                <EyeIcon className="size-5" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={() => copy(streamKeyState, "key")}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary transition-colors",
                "hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50"
              )}
              disabled={!streamKeyState}
            >
              {copiedKey ? (
                <span className="flex items-center gap-1 text-brand dark:text-brand-light">
                  <CheckIcon className="size-4" /> 복사됨
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <ClipboardIcon className="size-4" /> 복사
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleRotate}
              disabled={isRotating}
              aria-label="스트림 키 재발급"
              className={cn(
                "focus-ring-soft inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-amber-600 transition-colors",
                "hover:bg-amber-500/10 dark:text-amber-400"
              )}
              title="키 재발급"
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowPathIcon
                  className={cn("size-4", isRotating && "animate-spin")}
                />
                재발급
              </span>
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">
          * 키가 유출되었다면 재발급하세요. (기존 키 즉시 만료)
        </p>
      </div>

      <div className="mt-6 space-y-3 border-t border-border-subtle pt-4 sm:mt-8 sm:space-y-4">
        {closingCancelsBroadcast ? (
          <p className="text-xs leading-5 text-muted">
            이 창을 닫으면 방금 만든 방송이 취소됩니다. 스트림 키가 유출되었을
            때는 위에서 재발급을 사용하세요.
          </p>
        ) : null}
      </div>
    </>
  );

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={handleClose}
        className={cn(
          "focus-ring-soft h-11 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary transition-colors",
          "hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-50"
        )}
        disabled={isDeleting}
      >
        {closingCancelsBroadcast ? "생성 취소하고 닫기" : "닫기"}
      </button>

      <button
        type="button"
        onClick={handleMoveToBroadcast}
        disabled={!broadcastId}
        className="focus-ring-strong inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[188px]"
      >
        <span>방송 페이지로 이동</span>
        <ArrowTopRightOnSquareIcon className="size-4" />
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <BottomSheet
          open={open}
          title="방송 송출 정보"
          description="OBS 등 방송 소프트웨어에 아래 RTMP URL과 스트림 키를 입력하세요."
          onClose={hasNestedConfirmOpen ? () => {} : requestClose}
          contentClassName="pt-4"
          footer={footer}
        >
          {content}
        </BottomSheet>

        <ConfirmDialog
          open={closeConfirmOpen}
          title="생성한 방송 취소"
          description="이 창을 닫으면 방금 만든 방송이 취소됩니다. 계속할까요?"
          confirmLabel="생성 취소"
          cancelLabel="돌아가기"
          onConfirm={handleClose}
          onCancel={() => setCloseConfirmOpen(false)}
          loading={isDeleting}
        />
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      aria-hidden={!open}
      onMouseDown={hasNestedConfirmOpen ? undefined : requestClose}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-3 sm:items-center sm:p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative mx-auto w-full max-w-[680px] overflow-y-auto rounded-xl border border-border-subtle bg-surface p-4 shadow-2xl",
            "max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-32px)] sm:rounded-2xl sm:p-6"
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-start justify-between">
            <h2 className="text-lg font-bold text-primary sm:text-xl">
              방송 송출 정보
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="송출 정보 모달 닫기"
              title="닫기"
              className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDeleting}
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>
          {content}
          <div className="mt-2">{footer}</div>
        </div>
      </div>

      <ConfirmDialog
        open={closeConfirmOpen}
        title="생성한 방송 취소"
        description="이 창을 닫으면 방금 만든 방송이 취소됩니다. 계속할까요?"
        confirmLabel="생성 취소"
        cancelLabel="돌아가기"
        onConfirm={handleClose}
        onCancel={() => setCloseConfirmOpen(false)}
        loading={isDeleting}
      />
    </div>
  );
}
