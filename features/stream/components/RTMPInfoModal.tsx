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
 */

"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
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
import {
  deleteBroadcastAction,
  deleteLiveInputAction,
} from "@/features/stream/actions/delete";
import { rotateLiveInputKeyAction } from "@/features/stream/actions/key";

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
 * 3. Live Input(채널) 삭제 기능
 * 4. 모달 닫기 시 "방송 페이지로 이동"을 안 했다면 생성된 방송을 취소(삭제)하는 로직 포함
 */
export default function RTMPInfoModal({
  open,
  onOpenChange,
  rtmpUrl,
  streamKey,
  liveInputId,
  broadcastId,
}: RTMPInfoModalProps) {
  const router = useRouter();
  // 패널 참조 (포커스 트랩 등에서 사용)
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

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

  // 확인 모달 오픈 상태(명시적 버튼 클릭 시에만 true)
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 스트림 키 마스킹 (길이 고정 느낌 유지)
  const maskedKey = useMemo(() => {
    const len = Math.max(streamKeyState?.length || 0, 12);
    return "•".repeat(len);
  }, [streamKeyState]);

  // 열릴 때 첫 포커스 + 바디 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstFocusRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ESC / Tab Trap -> Escape는 닫기 로직(handleClose)으로 연결
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 닫기 시 브로드캐스트 삭제 여부를 결정하는 공통 핸들러
        handleClose();
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
  }, [open]);

  // NOTE:
  // 백드롭(오버레이) 클릭으로 모달을 닫히지 않도록 변경
  // (요청: 스트리밍 추가 시 모달창 옆 클릭시 닫힘 방지)
  // 패널 내부는 기존처럼 stopPropagation으로 외부로 이벤트 전파를 막음

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
      toast.error("복사에 실패했습니다.");
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
          toast.error(res.error ?? "키 재발급 실패");
        }
      } catch {
        toast.error("오류가 발생했습니다.");
      }
    });
  };

  const handleConfirmDelete = () => {
    startDelete(async () => {
      try {
        const res = await deleteLiveInputAction(liveInputId);
        if (!res?.success) {
          toast.error(res?.error ?? "삭제 실패");
          return;
        }
        toast.success("Live Input이 삭제되었습니다.");
      } finally {
        setConfirmOpen(false);
        onOpenChange(false);
      }
    });
  };

  // 닫기 공통 로직: 사용자가 "스트리밍 페이지로 이동" 하지 않았다면
  // 생성된 broadcast를 삭제하여 중복 생성을 방지
  const handleClose = () => {
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
          toast.error("취소 실패");
        }
      } catch {
        toast.error("오류가 발생했습니다.");
      } finally {
        onOpenChange(false);
      }
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-hidden={!open}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative mx-auto w-[min(640px,92vw)] rounded-2xl p-6 shadow-2xl",
          "bg-surface border border-border"
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold text-primary">방송 송출 정보</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-surface-dim transition-colors"
            disabled={isDeleting}
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        <p className="mb-6 text-sm text-muted">
          아래 정보를 OBS 등 방송 소프트웨어에 입력하세요.{" "}
          <span className="text-danger font-medium">
            스트림 키는 절대 공유하지 마세요.
          </span>
        </p>

        {/* RTMP URL */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium text-primary">RTMP URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-surface-dim border border-border px-3 py-2.5 text-sm font-mono text-primary break-all">
              {rtmpUrlState}
            </code>
            <button
              type="button"
              ref={firstFocusRef}
              onClick={() => copy(rtmpUrlState, "url")}
              className="shrink-0 btn-secondary h-11 text-sm border-border bg-surface hover:bg-surface-dim text-primary"
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

        {/* Stream Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-primary">스트림 키</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg bg-surface-dim border border-border px-3 py-2.5">
              <code className="flex-1 text-sm font-mono text-primary break-all">
                {showKey ? streamKeyState : maskedKey}
              </code>
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="p-1 text-muted hover:text-primary transition-colors"
                title={showKey ? "숨기기" : "보기"}
              >
                {showKey ? (
                  <EyeSlashIcon className="size-5" />
                ) : (
                  <EyeIcon className="size-5" />
                )}
              </button>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => copy(streamKeyState, "key")}
                className="flex-1 sm:flex-none btn-secondary h-11 text-sm border-border bg-surface hover:bg-surface-dim text-primary"
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
                className="flex-1 sm:flex-none btn-secondary h-11 text-sm border-border bg-surface hover:bg-surface-dim text-amber-600 dark:text-amber-400"
                title="키 재발급"
              >
                <ArrowPathIcon
                  className={cn("size-4", isRotating && "animate-spin")}
                />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted">
            * 키가 유출되었다면 재발급하세요. (기존 키 즉시 만료)
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting}
            className="text-sm font-medium text-danger hover:text-red-600 hover:underline underline-offset-4 disabled:opacity-50 transition-colors py-2"
          >
            {isDeleting ? "삭제 중..." : "Live Input 삭제"}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-none btn-secondary h-11 text-sm border-transparent bg-surface-dim hover:bg-border text-primary"
            >
              닫기
            </button>

            <button
              type="button"
              onClick={() => {
                if (!broadcastId) return;
                navigatedToBroadcastRef.current = true;
                onOpenChange(false);
                router.push(`/streams/${broadcastId}`);
              }}
              disabled={!broadcastId}
              className="flex-1 sm:flex-none btn-primary h-11 text-sm flex items-center justify-center gap-2"
            >
              <span>방송 페이지로 이동</span>
              <ArrowTopRightOnSquareIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Live Input 삭제"
        description="정말 삭제하시겠습니까? 방송 설정을 다시 해야 합니다."
        confirmLabel="삭제"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
        loading={isDeleting}
      />
    </div>
  );
}
