/**
 * File Name : features/stream/components/PrivateAccessModal.tsx
 * Description : 비공개 스트림 접근 비밀번호 입력 모달 (구 디자인 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.19  임도헌   Created   비공개 스트림 접근 비밀번호 모달 컴포넌트
 * 2025.08.30  임도헌   Modified  redirectHref/onSuccess 추가, 성공 시 자동 이동 지원
 * 2025.09.03  임도헌   Modified  에러코드별 UX 분기(로그인 유도/리프레시/리다이렉트) 적용
 * 2025.09.05  임도헌   Modified  redirectHref 미지정 시 상세로 fallback push + login next 기본값 지정
 * 2025.09.05  임도헌   Modified  (a11y) ESC 닫기/포커스 트랩/스크롤 락/autoComplete 보강
 * 2025.09.10  임도헌   Modified  진행 중 닫기 가드(ESC/배경/취소), a11y 보강(htmlFor/id, role="alert"), 라우팅 중복 정리
 * 2025.09.10  임도헌   Modified  열릴 때 현재 포커스 요소를 저장했다가 닫을 때 복귀
 * 2026.01.03  임도헌   Modified  actions/private 제거: 모달에서 lib/stream/unlockPrivateBroadcast 직접 호출로 단순화
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.18  임도헌   Modified  PRIVATE 언락/미존재 fallback의 redirectHref를 내부 경로 기준으로 정규화하고 replace 복귀 + returnTo 복원으로 게이트 재등장과 채널 문맥 이탈을 함께 완화
 * 2026.03.19  임도헌   Modified  AccessDenied 톤과 맞춰 비공개 방송 비밀번호 모달 카드 구조와 CTA 위계를 재정리
 * 2026.03.23  임도헌   Modified  모바일/데스크톱 모두 카드 폭을 한 단계 더 넓혀 비밀번호 입력 모달의 답답한 밀도를 완화
 * 2026.03.28  임도헌   Modified  프로필/카드 hover transform 내부에서도 모달이 뷰포트 기준으로 고정되도록 body portal 렌더링 적용
 * 2026.04.07  임도헌   Modified  모바일에서는 BottomSheet를 사용해 비밀번호 입력과 키보드 겹침을 완화
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.05.19  임도헌   Modified  비공개 방송 입장 비밀번호 입력에 current-password autocomplete를 명시해 브라우저 폼 경고 완화
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { unlockPrivateBroadcastAction } from "@/features/stream/actions/access";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { unlockErrorMessage } from "@/features/stream/utils/access";
import BottomSheet from "@/components/global/BottomSheet";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LockClosedIcon } from "@heroicons/react/24/outline";

interface PrivateAccessModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  streamId: number;
  redirectHref?: string;
  onSuccess?: () => void;
}

/**
 * 비공개 방송 접근을 위한 비밀번호 입력 모달
 *
 * - 비밀번호 검증 서버 액션(`unlockPrivateBroadcastAction`) 호출
 * - 성공 시 세션에 언락 정보 저장 및 대상 경로로 replace 복귀
 * - 에러 코드별 적절한 메시지 표시 또는 로그인 페이지 이동
 * - 403 안내 카드와 시각적 톤을 맞춰 게이트 전환 시 이질감을 줄임
 */
export default function PrivateAccessModal({
  open,
  onOpenChange,
  streamId,
  redirectHref,
  onSuccess,
}: PrivateAccessModalProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveElRef = useRef<HTMLElement | null>(null);

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const targetHref = sanitizeCallbackUrl(redirectHref ?? `/streams/${streamId}`);
  const contextFallbackHref = (() => {
    const queryString = targetHref.split("?")[1] ?? "";
    const params = new URLSearchParams(queryString);
    return sanitizeCallbackUrl(params.get("returnTo") ?? "/streams");
  })();
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      return;
    }

    if (isMobile) return;

    // 열릴 때 현재 포커스 저장
    lastActiveElRef.current = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    const t = setTimeout(() => inputRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!isPending) close();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter(
          (el) => !el.hasAttribute("disabled")
        );
        if (list.length === 0) return;

        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(t);
      unlockBodyScroll();
      window.removeEventListener("keydown", onKeyDown);
      // 닫을 때 포커스 복귀
      lastActiveElRef.current?.focus?.();
      lastActiveElRef.current = null;
    };
  }, [open, isMobile, isPending, close]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    const pwd = password.trim();
    if (!pwd) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    setError("");

    startTransition(async () => {
      const res = await unlockPrivateBroadcastAction(streamId, pwd);

      if (!res.success) {
        const code = res.error;
        const msg = code ? unlockErrorMessage[code] : "접근에 실패했습니다.";

        switch (code) {
          case "NOT_LOGGED_IN": {
            close();
            router.push(`/login?callbackUrl=${encodeURIComponent(targetHref)}`);
            return;
          }
          case "STREAM_NOT_FOUND": {
            close();
            // 삭제된 상세 대신 원래 목록/채널 문맥 우선 복귀
            router.replace(contextFallbackHref);
            return;
          }
          case "NOT_PRIVATE_STREAM":
          case "NO_PASSWORD_SET": {
            close();
            router.replace(targetHref);
            return;
          }
          case "INVALID_PASSWORD":
          case "BAD_REQUEST":
          case "MISSING_PASSWORD":
          default: {
            setError(msg);
            return;
          }
        }
      }

      close();
      onSuccess?.();
      // 403/모달 게이트 화면을 히스토리에 남기지 않도록 replace 복귀
      router.replace(targetHref);
    });
  };

  if (!open) return null;

  const formId = "private-access-form";

  const content = (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-primary">
          비밀번호
        </label>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="비밀번호 입력"
          autoComplete="current-password"
          className={cn(
            "input-primary h-12 rounded-2xl bg-surface-dim px-4",
            error && "ring-2 ring-danger/50"
          )}
          disabled={isPending}
        />
        {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      </div>
    </form>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={close}
        disabled={isPending}
        className="btn-secondary-modal min-h-[44px] px-4 text-sm font-medium"
      >
        취소
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isPending}
        className="btn-primary min-h-[44px] text-sm"
      >
        {isPending ? "확인 중..." : "입장하기"}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title="비공개 방송"
        description="방송 입장을 위해 비밀번호를 입력해주세요."
        onClose={() => !isPending && close()}
        contentClassName="pt-4"
        footer={footer}
      >
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="state-icon-wrap mb-4 size-[68px]">
            <LockClosedIcon className="size-8 text-amber-500" />
          </div>
          <p className="text-sm leading-6 text-muted">
            비공개 방송은 비밀번호가 확인되면 바로 입장할 수 있습니다.
          </p>
        </div>
        {content}
      </BottomSheet>
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => !isPending && close()}
    >
        <div
          ref={modalRef}
          className={cn(
          "mx-2.5 w-full max-w-xl rounded-3xl border border-border-subtle bg-surface px-6 py-7 shadow-2xl sm:mx-4 sm:px-8 sm:py-9"
        )}
        onClick={(e) => e.stopPropagation()}
      >
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="state-icon-wrap mb-4 size-[68px]">
              <LockClosedIcon className="size-8 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-primary">비공개 방송</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              방송 입장을 위해 비밀번호를 입력해주세요.
            </p>
          </div>

          {content}

          <div className="pt-2">{footer}</div>
      </div>
    </div>,
    document.body
  );
}
