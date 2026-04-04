/**
 * File Name : features/auth/components/form/ForgotPasswordForm.tsx
 * Description : 비밀번호 찾기 요청 폼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   이메일 기반 비밀번호 재설정 메일 요청 폼 추가
 * 2026.03.18  임도헌   Modified  로그인 가드에서 진입한 callbackUrl을 비밀번호 재설정 메일과 로그인 복귀 링크까지 유지
 */
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import {
  passwordResetRequestSchema,
  type PasswordResetRequestSchema,
} from "@/features/auth/schemas/passwordReset";
import { requestPasswordResetAction } from "@/features/auth/actions/passwordReset";

/**
 * 비밀번호 찾기 메일 요청 폼
 * - 이메일 입력 검증
 * - 재설정 메일 요청 서버 액션 호출
 * - emailVerified 기반 정책 안내
 */
export default function ForgotPasswordForm({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<PasswordResetRequestSchema>({
    resolver: zodResolver(passwordResetRequestSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = (data: PasswordResetRequestSchema) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", data.email);
      // 재설정 완료 후 다시 로그인할 때 원래 목적지 복귀 문맥 유지
      formData.append("callbackUrl", callbackUrl);

      const result = await requestPasswordResetAction(undefined, formData);

      if (!result.success) {
        if (result.fieldErrors) {
          applyFieldErrors<PasswordResetRequestSchema>(
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

      setSubmitted(true);
      toast.success("재설정 가능한 계정이면 안내 메일을 발송했습니다.");
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<PasswordResetRequestSchema>(formErrors, setFocus);
  };

  return (
    <div className="flex flex-col gap-form-gap">
      {submitted && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand dark:text-brand-light">
          재설정 가능한 계정이면 메일을 보냈습니다. 이메일 인증을 완료한 계정만
          비밀번호 찾기를 사용할 수 있습니다.
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col gap-form-gap"
        noValidate
      >
        <FormErrorSummary errors={errors} />

        <Input
          {...register("email")}
          type="email"
          label="이메일 주소"
          placeholder="가입한 이메일 주소"
          autoComplete="email"
          icon={<EnvelopeIcon className="size-5" />}
          errors={errors.email?.message ? [errors.email.message] : []}
        />

        <p className="text-xs leading-relaxed text-muted">
          이메일 인증을 완료한 계정만 비밀번호 찾기와 계정 복구를 사용할 수
          있습니다.
        </p>

        <Button
          text={isPending ? "메일 전송 중..." : "재설정 메일 보내기"}
          disabled={isPending}
        />
      </form>

      <div className="text-center text-sm text-muted">
        다시 로그인하시겠어요?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-brand dark:text-brand-light hover:underline transition-colors"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
