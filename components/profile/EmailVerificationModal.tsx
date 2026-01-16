/**
 * File Name : components/profile/EmailVerificationModal
 * Description : 이메일 인증 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.04.13  임도헌   Created
 * 2025.04.21  임도헌   Modified  성공상태를 감지하여 모달을 닫고 페이지를 새로고침하도록 수정
 * 2025.10.14  임도헌   Modified  UX/타이머/토스트 개선
 * 2025.10.29  임도헌   Modified  재전송 쿨다운 서버 고정(3분) 및 모달 닫아도 유지,
 *                                 cooldownRemaining/sent 플래그 도입, 토스트 중복 방지,
 *                                 입력 pattern을 [0-9]{6}으로 안전 적용
 * 2025.12.12  임도헌   Modified  모달 재오픈 시 useFormState 상태 리셋(key 리마운트),
 *                                 intent 기반 분기(request/resend/verify)로 서버액션 오동작 방지,
 *                                 자동 요청은 open 상승 에지에서 1회만 실행
 * 2026.01.06  임도헌   Modified  쿨다운 UX를 localStorage로도 유지(재오픈/새로고침 즉시 복원) + 서버 응답으로 보정
 * 2026.01.15  임도헌   Modified  [Logic] 핵심 로직 주석 보강 및 디자인 시스템(Semantic Token) 적용
 */
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XMarkIcon, EnvelopeIcon, KeyIcon } from "@heroicons/react/24/outline";
import Input from "../ui/Input";
import { verifyEmail } from "@/lib/auth/email/verifyEmail";
import { initialEmailVerifyState } from "@/lib/auth/email/verifyEmailState";
import { cn } from "@/lib/utils";

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

/**
 * [Inner Component 분리 이유]
 * useFormState는 컴포넌트가 마운트된 동안 상태를 유지합니다.
 * 모달을 닫았다가 다시 열었을 때, 이전 인증 상태(성공/실패/입력값)가 남아있지 않도록
 * 모달이 열릴 때마다 새로운 Key로 이 컴포넌트를 마운트하여 상태를 초기화합니다.
 */
function EmailVerificationModalInner({
  onClose,
  email,
}: Omit<EmailVerificationModalProps, "isOpen">) {
  const router = useRouter();

  // Server Action 상태 관리
  const [state, action] = useFormState(verifyEmail, initialEmailVerifyState);

  // UI 상태
  const [countdown, setCountdown] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  // 중복 실행 방지 및 토스트 제어용 Refs
  const lastActionRef = useRef<"request" | "resend" | "verify" | null>(null);
  const successToastShown = useRef(false);

  // 이메일 마스킹 (ex: te***@example.com)
  const maskedEmail = useMemo(() => {
    const [id, domain] = email.split("@");
    if (!domain) return email;
    const head = id.slice(0, 2);
    const tail = id.slice(Math.max(1, id.length - 3));
    return `${head}${"*".repeat(Math.max(1, id.length - 3))}${tail}@${domain}`;
  }, [email]);

  // mm:ss 포맷터
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /**
   * [Logic: 쿨다운 지속성 관리]
   * 사용자가 새로고침하거나 모달을 닫았다 열어도 재전송 쿨다운(3분)을 유지하기 위해
   * localStorage에 '언제까지 쿨다운인가(timestamp)'를 저장합니다.
   * Key는 이메일별로 유니크하게 생성합니다.
   */
  const cooldownStorageKey = useMemo(
    () => `bp:email-verify:cooldown-until:${email}`,
    [email]
  );

  // Storage에서 남은 시간 읽기
  const readCooldownRemainingFromStorage = useCallback((): number => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem(cooldownStorageKey);
      const until = raw ? Number(raw) : 0;
      if (!Number.isFinite(until) || until <= 0) return 0;

      const remaining = Math.ceil((until - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }, [cooldownStorageKey]);

  // Storage에 만료 시간 쓰기 (서버 응답 기준)
  const writeCooldownUntilToStorage = useCallback(
    (cooldownRemainingSeconds: number) => {
      if (typeof window === "undefined") return;
      try {
        const now = Date.now();
        const nextUntil = now + Math.max(0, cooldownRemainingSeconds) * 1000;

        // 기존 값이 더 길게 남아있다면(클라이언트가 더 보수적이라면) 유지
        const existingRaw = window.localStorage.getItem(cooldownStorageKey);
        const existingUntil = existingRaw ? Number(existingRaw) : 0;
        const finalUntil =
          Number.isFinite(existingUntil) && existingUntil > nextUntil
            ? existingUntil
            : nextUntil;

        if (finalUntil > now)
          window.localStorage.setItem(cooldownStorageKey, String(finalUntil));
        else window.localStorage.removeItem(cooldownStorageKey);
      } catch {}
    },
    [cooldownStorageKey]
  );

  // 쿨다운 종료 시 Storage 정리
  const clearCooldownStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(cooldownStorageKey);
    } catch {}
  }, [cooldownStorageKey]);

  // [Effect] 마운트 시 로컬 스토리지 확인하여 타이머 복구
  useEffect(() => {
    const remaining = readCooldownRemainingFromStorage();
    if (remaining > 0) setCountdown(remaining);
  }, [readCooldownRemainingFromStorage]);

  /**
   * [Effect] 서버 액션 응답 처리
   * - 서버가 쿨다운 시간을 내려주면(cooldownRemaining), 로컬 타이머와 스토리지 동기화
   * - 액션 종류(request/resend)에 따라 적절한 토스트 메시지 표시
   */
  useEffect(() => {
    if (!state.token) return; // 아직 초기 상태

    // 서버가 내려준 쿨다운 시간 동기화
    if (typeof state.cooldownRemaining === "number") {
      setCountdown(state.cooldownRemaining);
      writeCooldownUntilToStorage(state.cooldownRemaining);
    }

    // 토스트 피드백
    if (lastActionRef.current === "resend") {
      if (state.sent) toast.success("인증 코드를 재전송했습니다.");
      else if ((state.cooldownRemaining ?? 0) > 0) {
        toast.info(
          `잠시만요! 재전송은 ${formatTime(state.cooldownRemaining ?? 0)} 후에 가능합니다.`
        );
      }
    } else if (lastActionRef.current === "request") {
      if (state.sent) toast.success("인증 코드가 이메일로 전송되었습니다.");
    }
  }, [
    state.token,
    state.cooldownRemaining,
    state.sent,
    writeCooldownUntilToStorage,
  ]);

  // [Effect] 1초마다 카운트다운 감소
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // [Effect] 카운트다운 종료 시 스토리지 정리
  useEffect(() => {
    if (countdown > 0) return;
    clearCooldownStorage();
  }, [countdown, clearCooldownStorage]);

  // [Effect] 에러 메시지 토스트 (Validation Error 등)
  useEffect(() => {
    if (state.error?.formErrors?.length) {
      toast.error(state.error.formErrors[0] ?? "인증에 실패했습니다.");
    }
  }, [state.error]);

  // [Effect] 인증 성공 처리
  useEffect(() => {
    if (!state.success || successToastShown.current) return;

    successToastShown.current = true;
    toast.success("이메일 인증이 완료되었습니다.");

    clearCooldownStorage(); // 성공했으므로 쿨다운 정보 삭제
    onClose(); // 모달 닫기
    router.refresh(); // 페이지 데이터 갱신 (인증 상태 반영)
  }, [state.success, onClose, router, clearCooldownStorage]);

  // [Effect] 컴포넌트 마운트 시 '최초 요청(request)' 자동 실행
  useEffect(() => {
    const fd = new FormData();
    fd.append("email", email);
    fd.append("intent", "request");
    lastActionRef.current = "request";
    action(fd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  /**
   * 핸들러: 인증 코드 제출
   * - 6자리가 입력되면 자동으로 호출되거나, 엔터키로 호출됨
   */
  const handleVerify = useCallback(
    (token: string) => {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("token", token);
      fd.append("intent", "verify");
      lastActionRef.current = "verify";
      action(fd);
    },
    [action, email]
  );

  /**
   * 핸들러: 재전송 요청
   */
  const handleResend = useCallback(() => {
    const fd = new FormData();
    fd.append("email", email);
    fd.append("intent", "resend");
    lastActionRef.current = "resend";
    action(fd);
  }, [action, email]);

  // [Effect] 접근성: 포커스 트랩 및 ESC 닫기, 스크롤 잠금
  useEffect(() => {
    // 모달 진입 시 포커스 이동
    dialogRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    // Body 스크롤 잠금
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = original;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-verify-title"
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-md bg-surface shadow-2xl overflow-hidden outline-none flex flex-col",
          // [Mobile] Bottom Sheet 스타일 (하단에서 올라옴, 상단 둥글게)
          "h-auto rounded-t-2xl sm:rounded-2xl animate-slide-up sm:animate-fade-in",
          // [Border] 시맨틱 보더
          "border-t sm:border border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2
              id="email-verify-title"
              className="text-lg font-bold text-primary"
            >
              이메일 인증
            </h2>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted">
              <EnvelopeIcon className="size-4" />
              <span>{maskedEmail}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {state.token ? (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-primary mb-2 block">
                  인증 코드 입력
                </label>
                <Input
                  name="token"
                  placeholder="6자리 숫자"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  icon={<KeyIcon className="size-5" />}
                  className="text-center text-lg tracking-widest font-mono"
                  autoFocus
                  // 숫자만 입력받고 6자리 되면 자동 제출
                  onChange={(e) => {
                    const v =
                      e.target.value?.replace(/\D/g, "").slice(0, 6) ?? "";
                    e.target.value = v;
                    if (v.length === 6) handleVerify(v);
                  }}
                />
                <p className="mt-2 text-xs text-muted">
                  * 이메일로 전송된 6자리 코드를 입력해주세요.
                </p>
              </div>

              {/* 재전송 버튼 (타이머 연동) */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className={cn(
                    "text-sm font-medium transition-colors underline underline-offset-4",
                    countdown > 0
                      ? "text-muted cursor-not-allowed no-underline"
                      : "text-brand hover:text-brand-dark"
                  )}
                >
                  {countdown > 0
                    ? `재전송 가능까지 ${formatTime(countdown)}`
                    : "인증 코드 재전송"}
                </button>
              </div>
            </div>
          ) : (
            // 로딩 상태 (초기 request 중)
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="size-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              <p className="text-sm text-muted">
                인증 정보를 확인하고 있습니다...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper Component
 * - 모달이 열릴 때마다 Key를 변경하여 Inner Component를 새로 마운트합니다.
 * - 이를 통해 useFormState와 내부 상태를 깔끔하게 초기화합니다.
 */
export default function EmailVerificationModal({
  isOpen,
  onClose,
  email,
}: EmailVerificationModalProps) {
  const [openSeq, setOpenSeq] = useState(0);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpen.current) setOpenSeq((v) => v + 1);
    prevOpen.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <EmailVerificationModalInner
      key={`${email}-${openSeq}`}
      onClose={onClose}
      email={email}
    />
  );
}
