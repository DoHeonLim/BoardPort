/**
 * File Name : features/stream/components/StreamDetail/StreamSecretInfo.tsx
 * Description : 본인 방송 전용 RTMP/Key 정보 (키는 기본 숨김, 아이콘형 복사 버튼)
 * Author : 임도헌
 *
 * History
 * 2025.07.31  임도헌   Created
 * 2025.09.09  임도헌   Modified  alert→toast, 복사 가드, a11y
 * 2025.09.15  임도헌   Modified  키 기본 숨김 + 개별 보기 토글, 아이콘형 복사 버튼(성공 피드백)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */
"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { getStreamKey } from "@/features/stream/lib/getStreamKey";
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
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
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

  // ENV 폴백은 서버 액션에서 처리하지만, 초기 렌더에서 표시용 폴백 유지
  const fallbackRtmp = useMemo(
    () =>
      process.env.NEXT_PUBLIC_CLOUDFLARE_RTMP_URL?.trim() ||
      "rtmps://live.cloudflare.com:443/live/",
    []
  );

  const effectiveRtmp = rtmpUrl ?? fallbackRtmp;

  const maskedKey = useMemo(() => {
    const key = streamKey ?? "";
    return key ? "•".repeat(key.length) : "";
  }, [streamKey]);

  const fetchCreds = () =>
    startTransition(async () => {
      const res = await getStreamKey(broadcastId);
      if (!res.success) {
        const msg =
          res.error === "FORBIDDEN"
            ? "권한이 없습니다."
            : res.error === "NOT_FOUND"
              ? "방송을 찾을 수 없습니다."
              : "로그인이 필요합니다.";
        toast.error(msg);
        return;
      }
      setRtmpUrl(res.rtmpUrl);
      setStreamKey(res.streamKey);
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
          "mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
          "bg-surface-dim text-primary hover:bg-border"
        )}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {open ? (
          <>
            <EyeSlashIcon className="h-4 w-4" />
            스트리밍 정보 숨기기
          </>
        ) : (
          <>
            <EyeIcon className="h-4 w-4" />
            스트리밍 정보 보기
          </>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className="space-y-4 rounded-xl border border-border bg-surface-dim/30 p-4 text-sm"
        >
          {/* RTMP URL */}
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-muted text-xs">스트리밍 URL</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-surface border border-border p-2 font-mono text-[13px] text-primary">
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

          {/* Secret Key */}
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-muted text-xs">Secret Key</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-surface border border-border p-2 font-mono text-[13px] text-primary">
                {reveal ? (streamKey ?? "") : maskedKey}
              </code>
              <button
                type="button"
                onClick={() => {
                  if (!streamKey) fetchCreds();
                  setReveal((v) => !v);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-dim"
              >
                {reveal ? (
                  <EyeSlashIcon className="h-4 w-4 text-muted" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-muted" />
                )}
              </button>
              <IconGhostButton
                title={isPending ? "로딩..." : "Key 복사"}
                onClick={() => streamKey && copy(streamKey, "Secret Key")}
                showCheck={copiedKey}
                disabled={isPending || !streamKey}
              />
            </div>
          </div>

          <p className="text-[11px] text-rose-500 mt-2">
            * 스트림 키는 외부에 절대 노출하지 마세요.
          </p>
        </div>
      )}
    </>
  );
}
