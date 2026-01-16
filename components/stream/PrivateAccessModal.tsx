/**
 * File Name : components/stream/PrivateAccessModal
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
 */

"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockPrivateBroadcast } from "@/lib/stream/unlockPrivateBroadcast";
import { unlockErrorMessage } from "@/types/stream";
import { cn } from "@/lib/utils";

interface PrivateAccessModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  streamId: number;
  /** 성공 시 이동할 경로(옵션). 없으면 상세(`/streams/{id}`)로 이동 */
  redirectHref?: string;
  /** 성공 시 추가 작업(옵션). redirect 전에 호출 */
  onSuccess?: () => void;
}

export default function PrivateAccessModal({
  open,
  onOpenChange,
  streamId,
  redirectHref,
  onSuccess,
}: PrivateAccessModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveElRef = useRef<HTMLElement | null>(null);

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const targetHref = redirectHref ?? `/streams/${streamId}`;
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      return;
    }

    // 열릴 때 현재 포커스 저장
    lastActiveElRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      // 닫을 때 포커스 복귀
      lastActiveElRef.current?.focus?.();
      lastActiveElRef.current = null;
    };
  }, [open, isPending, close]);

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
      const res = await unlockPrivateBroadcast(streamId, pwd);

      if (!res.success) {
        const code = res.error;
        const msg = unlockErrorMessage[code] ?? "접근에 실패했습니다.";

        switch (code) {
          case "NOT_LOGGED_IN": {
            close();
            router.push(`/login?callbackUrl=${encodeURIComponent(targetHref)}`);
            return;
          }
          case "STREAM_NOT_FOUND": {
            close();
            router.replace("/streams");
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
      router.push(targetHref);
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => !isPending && close()}
    >
      <div
        ref={modalRef}
        className={cn(
          "w-full max-w-sm rounded-2xl p-6 shadow-xl mx-4",
          "bg-surface border border-border"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-bold text-primary">비공개 방송</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-primary">
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
              className={cn(
                "input-primary h-11 px-3 bg-surface-dim",
                error && "ring-2 ring-danger/50"
              )}
              disabled={isPending}
            />
            {error && (
              <p className="mt-1 text-xs text-danger font-medium">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              disabled={isPending}
              className="btn-secondary h-10 text-sm border-transparent hover:bg-black/5 dark:hover:bg-white/5"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary h-10 text-sm"
            >
              {isPending ? "확인 중..." : "입장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
