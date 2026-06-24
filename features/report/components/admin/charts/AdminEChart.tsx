"use client";

/**
 * File Name : features/report/components/admin/charts/AdminEChart.tsx
 * Description : 관리자 차트용 ECharts 공통 래퍼 및 시맨틱 토큰 연동 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   라이트/다크 시맨틱 토큰을 반영하는 관리자 ECharts 공통 래퍼와 테마 훅 추가
 * 2026.03.30  임도헌   Modified  height를 문자열까지 허용해 도넛 차트처럼 컨테이너 기준으로 유연하게 맞출 수 있게 확장
 */

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";
import { LineChart, PieChart, BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, GraphicComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { cn } from "@/lib/utils";

echarts.use([
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  GraphicComponent,
  CanvasRenderer,
]);

export interface AdminChartTheme {
  surface: string;
  surfaceDim: string;
  textPrimary: string;
  textMuted: string;
  borderSubtle: string;
}

const FALLBACK_THEME: AdminChartTheme = {
  surface: "#ffffff",
  surfaceDim: "#f1f5f9",
  textPrimary: "#1e293b",
  textMuted: "#64748b",
  borderSubtle: "#edf2f7",
};

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function readTheme(): AdminChartTheme {
  return {
    surface: readCssVar("--surface", FALLBACK_THEME.surface),
    surfaceDim: readCssVar("--surface-dim", FALLBACK_THEME.surfaceDim),
    textPrimary: readCssVar("--text-primary", FALLBACK_THEME.textPrimary),
    textMuted: readCssVar("--text-muted", FALLBACK_THEME.textMuted),
    borderSubtle: readCssVar("--border-subtle", FALLBACK_THEME.borderSubtle),
  };
}

/**
 * 관리자 차트용 시맨틱 테마 토큰 훅
 *
 * [기능]
 * 1. CSS 변수에서 라이트/다크 공용 차트 토큰을 읽어옴
 * 2. html/body 클래스 변경과 시스템 테마 변경을 감지해 차트 테마를 동기화
 *
 * @returns 현재 관리자 차트 테마 토큰 세트
 */
export function useAdminChartTheme() {
  const [theme, setTheme] = useState<AdminChartTheme>(FALLBACK_THEME);

  useEffect(() => {
    const syncTheme = () => setTheme(readTheme());
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", syncTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", syncTheme);
    };
  }, []);

  return theme;
}

interface AdminEChartProps {
  option: EChartsOption | ((theme: AdminChartTheme) => EChartsOption);
  height?: number | string;
  className?: string;
}

/**
 * 관리자 차트 공통 ECharts 래퍼
 *
 * [기능]
 * 1. 라이트/다크 시맨틱 토큰을 읽어 각 차트 옵션 함수에 전달
 * 2. number/string height를 모두 지원해 라인/바/도넛 차트 레이아웃을 공통 처리
 * 3. ReactEChartsCore 공통 옵션(notMerge/lazyUpdate/canvas renderer)을 한곳에 고정
 */
export default function AdminEChart({
  option,
  height = 220,
  className,
}: AdminEChartProps) {
  const theme = useAdminChartTheme();
  const resolvedOption = useMemo(
    () => (typeof option === "function" ? option(theme) : option),
    [option, theme]
  );

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={resolvedOption}
      notMerge
      lazyUpdate
      opts={{ renderer: "canvas" }}
      style={{ height, width: "100%" }}
      className={cn("min-h-0", className)}
    />
  );
}
