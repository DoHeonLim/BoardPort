/**
 * File Name : components/profile/PasswordChangeModal
 * Description : 비밀번호 변경 모달 컴포넌트
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
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  XMarkIcon,
  LockClosedIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

import Input from "../ui/Input";
import Button from "../ui/Button";
import {
  passwordChangeSchema,
  type PasswordUpdateType,
} from "@/lib/profile/form/passwordChangeSchema";
import { changePassword } from "@/lib/profile/update/changePassword";
import { cn } from "@/lib/utils";

type PasswordChangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

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
    reset,
    formState: { errors },
  } = useForm<PasswordUpdateType>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // 제출 중에는 UX 혼선을 막기 위해 닫기 방지
  const doClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") doClose();
    };
    window.addEventListener("keydown", handleKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = original;
    };
    // doClose는 submitting 의존이라서, isOpen/submitting으로 충분히 안정화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitting]);

  const onSubmit = handleSubmit(async (data: PasswordUpdateType) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("currentPassword", data.currentPassword);
      formData.append("password", data.password);
      formData.append("confirmPassword", data.confirmPassword);

      const response = await changePassword(formData);

      if (!response.success) {
        if (response.errors) {
          const { _, ...fieldErrors } = response.errors;
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            const message = Array.isArray(messages) ? messages[0] : messages;
            if (!message) return;
            setError(field as keyof PasswordUpdateType, {
              type: "manual",
              message,
            });
          });
          if (_ && _.length > 0) toast.error(_[0]);
        } else {
          toast.error("비밀번호 변경에 실패했습니다.");
        }
        return;
      }

      toast.success("비밀 항해 코드를 성공적으로 변경했습니다.");
      doClose();
    } catch (e) {
      console.error(e);
      toast.error("알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
          "h-auto rounded-t-2xl sm:rounded-2xl animate-slide-up sm:animate-fade-in",
          "border-t sm:border border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2
            id="password-change-title"
            className="text-lg font-bold text-primary"
          >
            비밀 항해 코드 변경
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
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <Input
            label="현재 비밀번호"
            type="password"
            passwordToggle
            required
            autoComplete="current-password"
            placeholder="현재 비밀 항해 코드"
            {...register("currentPassword")}
            errors={[errors.currentPassword?.message ?? ""]}
            icon={<LockClosedIcon className="size-5" />}
          />

          <Input
            label="새 비밀번호"
            type="password"
            passwordToggle
            required
            autoComplete="new-password"
            placeholder="새 비밀 항해 코드"
            {...register("password")}
            errors={[errors.password?.message ?? ""]}
            icon={<KeyIcon className="size-5" />}
          />

          <Input
            label="새 비밀번호 확인"
            type="password"
            passwordToggle
            required
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
