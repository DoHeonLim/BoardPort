/**
 * File Name : features/auth/components/form/ResetPasswordForm.tsx
 * Description : 비밀번호 재설정 폼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   재설정 토큰 기반 새 비밀번호 설정 폼 추가
 * 2026.03.18  임도헌   Modified  비밀번호 재설정 후 로그인 화면으로 복귀할 때 callbackUrl을 유지
 * 2026.05.19  임도헌   Modified  서버 액션 예외 시 pending 해제 후 토스트로 안내되도록 에러 처리 보강
 * 2026.08.30  임도헌   Modified  재설정 후 기본 프로필 복귀 경로는 로그인 주소에서 생략
 */
"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockClosedIcon, KeyIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import {
  passwordResetFormSchema,
  type PasswordResetFormSchema,
} from "@/features/auth/schemas/passwordReset";
import { resetPasswordAction } from "@/features/auth/actions/passwordReset";
import { buildAuthFlowHref } from "@/features/auth/utils/redirect";

/**
 * 비밀번호 재설정 폼
 * - 토큰 기반 새 비밀번호/확인 입력 검증
 * - 재설정 성공 후 로그인 화면 replace 이동
 */
export default function ResetPasswordForm({
  token,
  callbackUrl,
}: {
  token: string;
  callbackUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const loginHref = buildAuthFlowHref("/login", callbackUrl);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<PasswordResetFormSchema>({
    resolver: zodResolver(passwordResetFormSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = (data: PasswordResetFormSchema) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("token", token);
        formData.append("password", data.password);
        formData.append("confirmPassword", data.confirmPassword);

        const result = await resetPasswordAction(undefined, formData);

        if (!result.success) {
          if (result.fieldErrors) {
            applyFieldErrors<PasswordResetFormSchema>(
              setError,
              result.fieldErrors,
              { setFocus }
            );
          }
          if (result.error) {
            toast.error(result.error);
          }
          return;
        }

        toast.success(
          "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요."
        );
        router.replace(loginHref);
      } catch {
        toast.error("비밀번호 재설정 중 일시적인 오류가 발생했습니다.");
      }
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<PasswordResetFormSchema>(formErrors, setFocus);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="flex flex-col gap-form-gap"
      noValidate
    >
      <FormErrorSummary errors={errors} />

      <Input
        {...register("password")}
        type="password"
        passwordToggle
        label="새 비밀번호"
        placeholder="새 비밀번호"
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
        icon={<LockClosedIcon className="size-5" />}
        errors={errors.password?.message ? [errors.password.message] : []}
      />

      <Input
        {...register("confirmPassword")}
        type="password"
        passwordToggle
        label="새 비밀번호 확인"
        placeholder="새 비밀번호 확인"
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
        icon={<KeyIcon className="size-5" />}
        errors={
          errors.confirmPassword?.message
            ? [errors.confirmPassword.message]
            : []
        }
      />

      <Button
        text={isPending ? "재설정 중..." : "비밀번호 재설정"}
        disabled={isPending}
      />
    </form>
  );
}
