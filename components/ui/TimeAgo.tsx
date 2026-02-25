/**
 * File Name : components/ui/TimeAgo.tsx
 * Description : 시간 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.08  임도헌   Created
 * 2024.12.11  임도헌   Modified  마우스 올릴 시 정확한 시간 표시
 * 2024.12.26  임도헌   Modified  다크모드 추가
 * 2025.07.24  임도헌   Modified  스타일 변경
 * 2025.09.10  임도헌   Modified  자동 갱신(60s), 입력 타입 유연화, 시맨틱 <time>, 안전 가드, 불필요한 의존성 제거
 * 2025.11.06  임도헌   Modified  SSR-세이프 렌더(suppressHydrationWarning)로 깜빡임 제거,
 *                                 페이지 비가시 시 자동 일시정지, 리프레시 'auto' 주기 추가,
 *                                 tooltipFormatter/locale 옵션 확장
 * 2026.01.11  임도헌   Modified  시맨틱 텍스트 색상 적용 (text-muted)
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatToTimeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** 입력으로 허용하는 시간 타입 */
type TimeInput = string | number | Date;

interface TimeAgoProps {
  /** Date | timestamp(ms) | 파싱 가능한 문자열(권장: ISO) */
  date: TimeInput;

  /**
   * 갱신 간격(ms). "auto"면 경과 시간에 따라:
   * < 1분: 5초 / < 1시간: 30초 / < 1일: 5분 / 그 외: 1시간
   * @default "auto"
   */
  refreshMs?: number | "auto";

  /** 자동 갱신 off (정적 표시용) */
  live?: boolean; // default: true

  className?: string;

  /** 툴팁 표시에 사용할 타임존 */
  tooltipTimeZone?: string; // default: "Asia/Seoul"

  /** 툴팁 문자열 직접 생성 (있으면 이게 우선) */
  tooltipFormatter?: (d: Date) => string;

  /** locale (툴팁에 사용) */
  locale?: string; // default: "ko-KR"

  /** 잘못된 날짜일 때 보여줄 대체 텍스트 */
  fallbackText?: string; // default: "-"
}

/** 안전한 Date 변환 */
function toValidDate(input: TimeInput): Date | null {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 경과 시간 기반 자동 주기 계산 */
function computeAutoInterval(now: number, target: number): number {
  const diff = Math.abs(now - target);
  const s = 1000;
  const m = 60 * s;
  const h = 60 * m;

  if (diff < 1 * m) return 5 * s; // < 1분 : 5초
  if (diff < 60 * m) return 30 * s; // < 1시간 : 30초
  if (diff < 24 * h) return 5 * m; // < 1일 : 5분
  return 60 * m; // 그 외 : 1시간
}

export default function TimeAgo({
  date,
  refreshMs = "auto",
  live = true,
  className = "",
  tooltipTimeZone = "Asia/Seoul",
  tooltipFormatter,
  locale = "ko-KR",
  fallbackText = "-",
}: TimeAgoProps) {
  const parsedDate = useMemo(() => toValidDate(date), [date]);
  const [now, setNow] = useState<number>(() => Date.now());
  const timerRef = useRef<number | null>(null);

  // 현재 시점 기준 상대시간 텍스트 (클라이언트/서버 동일 계산)
  const relative = useMemo(() => {
    if (!parsedDate) return null;
    // now 를 두 번째 인자로 넘겨서, now 변경 시마다 재계산
    return formatToTimeAgo(parsedDate.toISOString(), now);
  }, [parsedDate, now]);

  // 툴팁(절대 시간)
  const tooltip = useMemo(() => {
    if (!parsedDate) return "잘못된 날짜 형식";
    if (tooltipFormatter) return tooltipFormatter(parsedDate);
    try {
      return parsedDate.toLocaleString(locale, {
        timeZone: tooltipTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return parsedDate.toISOString();
    }
  }, [parsedDate, tooltipFormatter, tooltipTimeZone, locale]);

  // 자동 갱신 타이머: 페이지 가시성에 따라 일시 정지
  useEffect(() => {
    if (!parsedDate || !live) return;

    const schedule = () => {
      const base =
        typeof refreshMs === "number"
          ? refreshMs
          : computeAutoInterval(Date.now(), parsedDate.getTime());

      // setTimeout으로 가변 주기 스케줄링(Interval drift 최소화)
      timerRef.current = window.setTimeout(
        () => {
          setNow(Date.now());
          schedule(); // 재귀 스케줄
        },
        Math.max(1000, base)
      ); // 최소 1초
    };

    // 가시성 이벤트 핸들링
    const onVisibility = () => {
      // 숨김이면 타이머 중단, 보이면 재시작
      if (document.hidden) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        if (!timerRef.current) schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility, {
      passive: true,
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [parsedDate, refreshMs, live]);

  const baseClass = "text-xs text-muted hover:text-primary transition-colors";

  // 잘못된 날짜짜
  if (!parsedDate) {
    return (
      <time className={cn(baseClass, className)} title="Invalid Date">
        {fallbackText}
      </time>
    );
  }

  // SSR-세이프: 서버/클라 상대시간이 약간 달라도 경고 없이 수용
  return (
    <time
      suppressHydrationWarning
      dateTime={parsedDate.toISOString()}
      className={cn(baseClass, className)}
      title={tooltip}
    >
      {relative}
    </time>
  );
}
