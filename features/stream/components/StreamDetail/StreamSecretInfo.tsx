/**
 * File Name : features/stream/components/StreamDetail/StreamSecretInfo.tsx
 * Description : 본인 방송 전용 RTMP/Key 정보 (키는 기본 숨김, 아이콘형 복사 버튼)
 * Author : 임도헌
 *
 * History
 * 2025.07.31  임도헌   Created
 * 2025.09.09  임도헌   Modified  alert -> toast, 복사 가드, a11y
 * 2025.09.15  임도헌   Modified  키 기본 숨김 + 개별 보기 토글, 아이콘형 복사 버튼(성공 피드백)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.06  임도헌   Modified  복사/보기 아이콘 버튼 터치 타겟을 44px 기준에 맞게 확장
 * 2026.03.19  임도헌   Modified  스트림 상세 정보 카드 톤에 맞춰 owner 전용 송출 정보 패널 보더 대비를 완화
 * 2026.03.20  임도헌   Modified  송출 정보 라벨과 버튼 문구를 제작자 문맥에 맞게 더 직관적으로 정리
 * 2026.03.24  임도헌   Modified  owner 관리 패널 무게를 줄이기 위해 송출 정보 버튼과 내부 패널 간격/톤을 조금 더 절제
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 송출 정보 버튼·코드·경고 문구 타이포를 정리
 * 2026.05.19  임도헌   Modified  RTMP URL 표시 기본값을 Cloudflare 기본 ingest URL로 통일
 */
"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { getStreamKeyAction } from "@/features/stream/actions/key";
import {
  EyeIcon,
  EyeSlashIcon,
  ClipboardIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface StreamSecretInfoProps {
  /** Broadcast id */
  broadcastId: number;
  /** 서버에서 미리 주입한 초기 키(선택). 없으면 패널 열 때 서버 액션으로 로드 */
  initialStreamKey?: string | null;
}

/**
 * 방송 소유자에게만 보이는 OBS 송출 정보 패널
 * - RTMP URL과 Stream Key를 표시하고 복사할 수 있음
 * - 보안을 위해 기본적으로는 숨겨져 있으며, '보기' 버튼 클릭 시 로드
 * - 서버에서 키가 아직 주입되지 않았으면 패널을 열 때 서버 액션으로 조회
 */
function IconGhostButton({
  title,
  onClick,
  showCheck,
  disabled,
}: {
  title: string;
  onClick: () => void;
  showCheck?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors",
        "border border-border bg-surface hover:bg-surface-dim disabled:opacity-50"
      )}
    >
      {showCheck ? (
        <CheckIcon className="h-4 w-4 text-emerald-600" />
      ) : (
        <ClipboardIcon className="h-4 w-4 text-muted" />
      )}
    </button>
  );
}

export default function StreamSecretInfo({
  broadcastId,
  initialStreamKey,
}: StreamSecretInfoProps) {
  const [open, setOpen] = useState(false); // 패널 접기/펼치기
  const [reveal, setReveal] = useState(false); // 키 보기/숨기기
  const [copiedURL, setCopiedURL] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState<string | null>(
    initialStreamKey ?? null
  );
  const [isPending, startTransition] = useTransition();
  const panelId = useId();

  // 서버 액션 응답 전에도 송출 URL 형식을 안내하기 위한 표시용 기본값
  const fallbackRtmp = useMemo(
    () => "rtmps://live.cloudflare.com:443/live/",
    []
  );

  const effectiveRtmp = rtmpUrl ?? fallbackRtmp;

  const maskedKey = useMemo(() => {
    const key = streamKey ?? "";
    return key ? "•".repeat(key.length) : "";
  }, [streamKey]);

  const fetchCreds = () =>
    startTransition(async () => {
      const res = await getStreamKeyAction(broadcastId);

      if (res.success) {
        setRtmpUrl(res.rtmpUrl);
        setStreamKey(res.streamKey);
      } else {
        const msg =
          res.error === "FORBIDDEN"
            ? "권한이 없습니다."
            : res.error === "NOT_FOUND"
              ? "방송을 찾을 수 없습니다."
              : "로그인이 필요합니다.";
        toast.error(msg);
      }
    });

  const onTogglePanel = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setReveal(false); // 열 때 항상 숨김으로 시작
      if (!streamKey || !rtmpUrl) fetchCreds();
    }
  };

  const copy = async (text: string, label: "URL" | "Secret Key") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}가 복사되었습니다.`);
      if (label === "URL") {
        setCopiedURL(true);
        setTimeout(() => setCopiedURL(false), 1200);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 1200);
      }
    } catch {
      toast.error("복사 실패");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onTogglePanel}
        className={cn(
          "focus-ring-soft mb-2.5 inline-flex items-center gap-2 rounded-full border border-border-subtle px-3.5 py-2 text-sm font-medium transition-colors",
          "bg-surface-dim/70 text-primary hover:bg-surface-dim"
        )}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {open ? (
          <>
            <EyeSlashIcon className="h-4 w-4" />
            송출 정보 숨기기
          </>
        ) : (
          <>
            <EyeIcon className="h-4 w-4" />
            송출 정보 보기
          </>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className="space-y-3 rounded-xl border border-border-subtle bg-surface-dim/20 p-3.5 text-sm sm:p-4"
        >
          {/* RTMP 주소 */}
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-muted text-xs">송출 주소</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded border border-border-subtle bg-surface p-2 font-mono text-sm text-primary">
                {effectiveRtmp}
              </code>
              <IconGhostButton
                title={isPending ? "로딩..." : "URL 복사"}
                onClick={() => copy(effectiveRtmp, "URL")}
                showCheck={copiedURL}
                disabled={isPending}
              />
            </div>
          </div>

          {/* 비밀 키 */}
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-muted text-xs">송출 키</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded border border-border-subtle bg-surface p-2 font-mono text-sm text-primary">
                {reveal ? (streamKey ?? "") : maskedKey}
              </code>
              <button
                type="button"
                onClick={() => {
                  if (!streamKey) fetchCreds();
                  setReveal((v) => !v);
                }}
                aria-label={reveal ? "스트림 키 숨기기" : "스트림 키 보기"}
                className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-dim"
              >
                {reveal ? (
                  <EyeSlashIcon className="h-4 w-4 text-muted" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-muted" />
                )}
              </button>
              <IconGhostButton
                title={isPending ? "로딩..." : "송출 키 복사"}
                onClick={() => streamKey && copy(streamKey, "Secret Key")}
                showCheck={copiedKey}
                disabled={isPending || !streamKey}
              />
            </div>
          </div>

          <p className="mt-2 text-xs text-rose-500">
            * 송출 키는 외부에 절대 노출하지 마세요.
          </p>
        </div>
      )}
    </>
  );
}
