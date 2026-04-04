/**
 * File Name : features/user/components/profile/PasswordChangeModal.tsx
 * Description : 비밀번호 변경 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.28  임도헌   Created
 * 2024.11.28  임도헌   Modified  비밀번호 변경 모달 컴포넌트 추가
 * 2024.12.17  임도헌   Modified  비밀번호 변경 모달 디자인 변경(다크모드)
 * 2024.12.29  임도헌   Modified  비밀번호 변경 모달 스타일 재 변경
 * 2024.12.30  임도헌   Modified  비밀번호 변경 모달 modals폴더로 이동
 * 2025.10.10  임도헌   Modified  passwordToggle 레이아웃 수정
 * 2025.10.29  임도헌   Modified  onSubmit 연결 수정(action→onSubmit), 제출 중 중복 방지, id/label 연결, autoComplete/aria-pressed 보강, 예외 토스트 추가
 * 2025.12.09  임도헌   Modified  서버 에러(_ 키) 토스트 처리 및 필드 에러 매핑 보강
 * 2025.12.12  임도헌   Modified  모달 UX 표준화(ESC/스크롤락/포커스복원/overlay 버블링 방지/제출중 닫기 가드),
 *                                 password 표시/숨기기 버튼을 Input(passwordToggle)로 위임하여 중복 UI 제거
 * 2026.01.15  임도헌   Modified  [Rule 5.1] 시맨틱 토큰, 반응형 레이아웃 적용
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.24  임도헌   Modified  Action 연결 및 타입 호환성 수정
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.07  임도헌   Modified  비밀번호 변경 실패 피드백 문구를 구체화(v1.2)
 * 2026.03.08  임도헌   Modified  FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반 커스텀 검증 UX 적용
 * 2026.03.12  임도헌   Modified  공용 bodyScrollLock 유틸 적용으로 중첩 모달에서도 스크롤 잠금/복구 안정화
 * 2026.03.12  임도헌   Modified  커스텀 검증 UX와 bodyScrollLock 기반 모달 스크롤 잠금 흐름 명확화
 * 2026.03.22  임도헌   Modified  최근 모달 톤 기준으로 외곽선과 헤더 보더 강도 정리
 * 2026.03.22  임도헌   Modified  프로필 유틸 모달 모션 규칙 통일을 위해 진입 transform 애니메이션 제거
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  passwordChangeSchema,
  type PasswordChangeDTO,
} from "@/features/user/schemas";
import { changePasswordAction } from "@/features/user/actions/profile";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import { toast } from "sonner";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import {
  XMarkIcon,
  LockClosedIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";

type PasswordChangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * 비밀번호 변경 모달
 *
 * [기능]
 * 1. 현재 비밀번호 확인 및 새 비밀번호 입력
 * 2. 비밀번호 일치 및 유효성 검사 (Zod)
 * 3. FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반 검증 UX 적용
 * 4. 변경 성공 시 Toast 알림 및 폼 초기화
 * 5. 접근성 (ESC 닫기, 포커스 관리, 스크롤 잠금)
 */
export default function PasswordChangeModal({
  isOpen,
  onClose,
}: PasswordChangeModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeDTO>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const doClose = () => {
    if (submitting) return; // 제출 중 닫기 방지
    reset(); // 폼 초기화
    onClose();
  };

  // 1. 접근성 및 이벤트 리스너 설정
  useEffect(() => {
    if (!isOpen) return;

    // 초기 포커스 이동
    dialogRef.current?.focus();

    // ESC 키로 닫기
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") doClose();
    };
    window.addEventListener("keydown", handleKey);

    // Body 스크롤 잠금
    lockBodyScroll();

    return () => {
      window.removeEventListener("keydown", handleKey);
      unlockBodyScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitting]);

  // 2. 폼 제출 핸들러
  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<PasswordChangeDTO>(formErrors, setFocus);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={doClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-change-title"
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-md bg-surface shadow-2xl overflow-hidden outline-none flex flex-col",
          "h-auto rounded-t-2xl sm:rounded-2xl",
          "border-t sm:border border-border-subtle"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2
            id="password-change-title"
            className="text-lg font-bold text-primary"
          >
            비밀번호 변경
          </h2>
          <button
            onClick={doClose}
            disabled={submitting}
            className="p-2 -mr-2 text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(
            async (data: PasswordChangeDTO) => {
              if (submitting) return;
              setSubmitting(true);

              try {
                const formData = new FormData();
                formData.append("currentPassword", data.currentPassword);
                formData.append("password", data.password);
                formData.append("confirmPassword", data.confirmPassword);

                const response = await changePasswordAction(formData);

                if (!response.success) {
                  if (response.errors) {
                    const { _, ...fieldErrors } = response.errors;

                    if (_ && _.length > 0) {
                      toast.error(_[0]);
                    }

                    applyFieldErrors<PasswordChangeDTO>(setError, fieldErrors, {
                      setFocus,
                    });
                  } else {
                    toast.error(
                      "비밀번호 변경에 실패했습니다. 입력 내용을 다시 확인해주세요."
                    );
                  }
                  return;
                }

                toast.success("비밀번호를 성공적으로 변경했습니다.");
                doClose();
              } catch (e) {
                console.error(e);
                toast.error(
                  "비밀번호 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
                );
              } finally {
                setSubmitting(false);
              }
            },
            onInvalid
          )}
          className="p-6 space-y-5"
          noValidate
        >
          <FormErrorSummary errors={errors} />

          <Input
            label="현재 비밀번호"
            type="password"
            passwordToggle
            required
            autoComplete="current-password"
            placeholder="현재 비밀번호"
            {...register("currentPassword")}
            errors={[errors.currentPassword?.message ?? ""]}
            icon={<LockClosedIcon className="size-5" />}
          />

          <div className="space-y-1.5">
            <Input
              label="새 비밀번호"
              type="password"
              passwordToggle
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              placeholder="새 비밀번호"
              {...register("password")}
              errors={[errors.password?.message ?? ""]}
              icon={<KeyIcon className="size-5" />}
            />
            <p className="pl-1 text-xs text-muted">
              {PASSWORD_MIN_LENGTH}자 이상, 소문자/숫자/특수문자를 포함해주세요.
            </p>
          </div>

          <Input
            label="새 비밀번호 확인"
            type="password"
            passwordToggle
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            {...register("confirmPassword")}
            errors={[errors.confirmPassword?.message ?? ""]}
            icon={<KeyIcon className="size-5" />}
          />

          <div className="pt-2 flex gap-3 justify-end">
            <button
              type="button"
              onClick={doClose}
              disabled={submitting}
              className="btn-secondary h-10 text-sm border-transparent hover:bg-surface-dim"
            >
              취소
            </button>
            <Button
              text={submitting ? "변경 중..." : "변경 완료"}
              disabled={submitting}
              className="w-auto px-6 h-10 text-sm"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
