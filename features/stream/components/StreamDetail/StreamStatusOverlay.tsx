/**
 * File Name : features/stream/components/StreamDetail/StreamStatusOverlay.tsx
 * Description : 플레이어 위에 상태를 덮어쓰는 스트림 상태 오버레이
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.31  임도헌   Created   플레이어 상태 오버레이 컴포넌트 분리
 * 2026.03.20  임도헌   Renamed   StreamEndedOverlay -> StreamStatusOverlay로 이름을 변경하고 종료 외 READY, DISCONNECTED 상태까지 공통 처리
 * 2026.03.21  임도헌   Modified  방송 상세 플레이어 위 상태 표현을 카드형 오버레이로 정리하고 모바일 작은 화면 대응을 보강
 * 2026.03.24  임도헌   Modified  라이트 모드에서도 카드 배경과 텍스트 대비가 충분히 보이도록 오버레이 표면 톤을 보정
 * 2026.03.24  임도헌   Modified  모바일은 상태 카드를 플레이어 폭에 더 가깝게 확장해 좌우 검은 여백 체감을 줄임
 * 2026.03.24  임도헌   Modified  상태 카드 배경을 불투명한 단색 표면으로 고정해 플레이어 배경과 섞여 보이지 않게 조정
 * 2026.03.24  임도헌   Modified  모바일은 오버레이 패딩을 제거하고 카드가 플레이어 폭을 거의 꽉 채우도록 조정
 * 2026.03.24  임도헌   Modified  라이트/다크 모드에서 서로 다른 오버레이 표면 톤을 적용해 각 모드 위계를 자연스럽게 분리
 * 2026.03.24  임도헌   Modified  다크 모드는 브랜드 네이비 대신 중성 다크 그레이 표면으로 조정해 버튼과의 이질감을 완화
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 오버레이 CTA weight를 500 기준으로 정리
 * 2026.04.16  임도헌   Modified  종료 오버레이 CTA는 자동 prefetch를 끄고 상태 변화가 있을 때만 이동 의도를 받도록 조정
 * 2026.04.20  임도헌   Modified  상세 상단바와 z-index 충돌이 없도록 오버레이 레벨을 한 단계 낮춤
 * 2026.04.25  임도헌   Modified  live-status 수신 상태를 부모 컴포넌트로 전달해 플레이어 렌더 조건과 동기화
 * 2026.05.16  임도헌   Modified  live-status payload 타입을 명시해 any 캐스팅 제거
 * 2026.05.17  임도헌   Modified  live-status 직접 구독을 제거하고 상세 셸 단일 구독 상태를 props로 수신
 */

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { StreamStatus } from "@/features/stream/types";
import { cn } from "@/lib/utils";

interface StreamStatusOverlayProps {
  username: string;
  status: StreamStatus | string;
  isOwner?: boolean;
}

/**
 * 방송이 CONNECTED가 아닐 때 플레이어 위에 덮어씌우는 상태 오버레이
 * - ENDED: 채널 다시보기 CTA 제공
 * - DISCONNECTED/READY 계열: 시청자 또는 소유자에게 송출 준비 상태 안내
 * - `live-status`는 상세 셸에서 한 번만 구독하고, 이 컴포넌트는 전달받은 상태만 표시
 * - 종료 CTA는 자동 프리패치를 생략해 상세 초기 네트워크 경쟁 방지
 */
export default function StreamStatusOverlay({
  username,
  status,
  isOwner = false,
}: StreamStatusOverlayProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const current = (status?.toUpperCase?.() as StreamStatus) || "DISCONNECTED";

  useEffect(() => {
    // 종료 상태에서는 다시보기 CTA로 포커스를 보내 키보드 흐름 유지
    if (current !== "ENDED") return;
    const t = setTimeout(() => linkRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [current]);

  const safeHref = username
    ? `/profile/${encodeURIComponent(username)}/channel`
    : "/streams";

  if (current === "CONNECTED") return null;

  const isEnded = current === "ENDED";
  const title = isEnded
    ? "방송이 종료되었습니다"
    : isOwner
      ? "송출을 준비하고 있습니다"
      : "방송 준비 중입니다";
  const description = isEnded
    ? "채널 다시보기에서 방금 항해를 이어 확인할 수 있습니다."
    : isOwner
      ? "송출 정보를 확인한 뒤 OBS에서 방송을 시작하세요."
      : "선장이 방송을 준비하고 있습니다. 잠시만 기다려주세요.";
  const dotClass = isEnded ? "bg-red-400/80" : "bg-amber-300/90";

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 px-0 backdrop-blur-sm sm:px-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-none bg-surface px-5 py-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:h-auto sm:max-w-sm sm:rounded-3xl sm:border sm:border-border-subtle sm:px-6 sm:py-7 sm:ring-1 sm:ring-black/5 dark:bg-[#161c26] dark:shadow-[0_22px_48px_rgba(15,23,42,0.24)] dark:sm:border-white/10 dark:sm:ring-black/10">
        <div className="mb-3 rounded-full border border-border-subtle bg-surface-dim p-3.5 sm:mb-4 sm:p-4 dark:border-white/10 dark:bg-white/6">
          <div
            className={cn("h-3 w-3 rounded-full", dotClass)}
            aria-hidden="true"
          />
        </div>
        <p className="text-lg font-bold tracking-tight text-primary sm:text-xl dark:text-white">
          {title}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted sm:text-sm sm:leading-6 dark:text-white/75">
          {description}
        </p>
        {isEnded && (
          <Link
            ref={linkRef}
            href={safeHref}
            prefetch={false}
            className={cn(
              "focus-ring-strong mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors sm:mt-5 sm:min-h-[44px] sm:w-auto sm:rounded-2xl sm:px-5 sm:text-base",
              "bg-brand text-white hover:bg-brand-dark"
            )}
          >
            채널 다시보기로 이동
          </Link>
        )}
      </div>
    </div>
  );
}
