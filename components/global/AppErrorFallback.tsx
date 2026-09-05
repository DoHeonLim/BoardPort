/**
 * File Name : components/global/AppErrorFallback.tsx
 * Description : 앱 라우트 오류 복구 공용 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   오류 안내와 reset 재시도, 안전한 목록 복귀 경로를 제공하는 공용 fallback 추가
 * 2026.09.05  임도헌   Modified  통제 환경 검증에서 확인한 운영 Console 오류 원문 출력 제거
 * 2026.09.05  임도헌   Modified  reset 단독 호출의 서버 재조회 누락을 router refresh와 transition으로 보완
 */

"use client";

import { startTransition, useEffect, useId, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
 * - 재시도는 서버 payload 갱신과 가장 가까운 Error Boundary reset을 같은 transition에서 실행
 * - 운영 브라우저에는 오류 원문 출력 제외, 개발 환경에서만 상세 로그 기록
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
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // 서버 오류의 응답 마스킹에만 의존하지 않도록 운영 브라우저의 원문 출력 제외.
    // 클라이언트 오류도 포함하므로 상세 원인은 개발 환경에서만 기록.
    if (process.env.NODE_ENV === "development") {
      console.error("App route error boundary:", error);
    }
    titleRef.current?.focus();
  }, [error]);

  const retry = () => {
    // reset만 호출하면 실패한 Server Component payload를 재사용해 복구되지 않는 문제 보완.
    // 원인 해제 후 실제 서버 재조회와 오류 경계 초기화를 함께 요청.
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

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
            onClick={retry}
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
