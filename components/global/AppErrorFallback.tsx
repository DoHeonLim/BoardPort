/**
 * File Name : components/global/AppErrorFallback.tsx
 * Description : 앱 라우트 오류 복구 공용 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   오류 안내와 reset 재시도, 안전한 목록 복귀 경로를 제공하는 공용 fallback 추가
 */

"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/** Next.js route error boundary가 전달하는 공통 props */
export interface RouteErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

interface AppErrorFallbackProps extends RouteErrorBoundaryProps {
  title?: string;
  description?: string;
  fallbackHref?: string;
  fallbackLabel?: string;
}

/**
 * 라우트 오류를 설명하고 현재 segment 재시도와 안전한 경로 복귀를 제공
 *
 * - 오류 화면 진입 시 제목으로 포커스를 옮겨 화면 전환을 보조기기에 전달
 * - 사용자에게 내부 오류 메시지를 노출하지 않고 digest만 문제 추적용으로 표시
 * - `reset`은 가장 가까운 Error Boundary segment를 다시 렌더링
 *
 * @param props - 오류 객체, reset 함수와 화면별 안내·복귀 경로
 * @returns 접근 가능한 앱 오류 복구 화면
 */
export default function AppErrorFallback({
  error,
  reset,
  title = "항해 중 문제가 발생했습니다",
  description = "페이지를 불러오지 못했습니다. 잠시 후 다시 시도하거나 상품 목록으로 돌아가 주세요.",
  fallbackHref = "/products",
  fallbackLabel = "상품 목록으로",
}: AppErrorFallbackProps) {
  const titleId = useId();
  const descriptionId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // 운영 환경의 상세 오류 메시지는 숨기되 개발자 콘솔에는 원인을 남긴다.
    console.error("App route error boundary:", error);
    titleRef.current?.focus();
  }, [error]);

  return (
    <div className="state-screen min-h-[60vh]">
      <section
        className="state-card"
        role="alert"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="state-icon-wrap" aria-hidden="true">
          <ExclamationTriangleIcon className="size-10 text-danger" />
        </div>

        <h1
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className="state-title outline-none"
        >
          {title}
        </h1>
        <p id={descriptionId} className="state-description">
          {description}
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-muted">
            오류 참조: <code>{error.digest}</code>
          </p>
        ) : null}

        <div className="state-actions">
          <button
            type="button"
            onClick={reset}
            className="btn-primary min-h-[44px] w-full"
          >
            다시 시도
          </button>
          <Link
            href={fallbackHref}
            className="btn-secondary inline-flex min-h-[44px] w-full items-center justify-center"
          >
            {fallbackLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
