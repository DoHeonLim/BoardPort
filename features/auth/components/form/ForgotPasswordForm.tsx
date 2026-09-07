/**
 * File Name : features/auth/components/form/ForgotPasswordForm.tsx
 * Description : 비밀번호 찾기 요청 폼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   이메일 기반 비밀번호 재설정 메일 요청 폼 추가
 * 2026.03.18  임도헌   Modified  로그인 가드에서 진입한 callbackUrl을 비밀번호 재설정 메일과 로그인 복귀 링크까지 유지
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 안내 문구와 복귀 링크 타이포 계층을 정리
 * 2026.04.20  임도헌   Modified  계정 노출 방지 정책을 유지하면서도 비밀번호 재설정 요청 성공 문구를 더 자연스럽게 정리
 * 2026.05.12  임도헌   Modified  로그인 복귀 링크 클릭 시 blur 검증으로 이동이 지연되지 않도록 처리
 * 2026.05.19  임도헌   Modified  서버 액션 예외 시 pending 해제 후 토스트로 안내되도록 에러 처리 보강
 * 2026.08.30  임도헌   Modified  기본 프로필 복귀 경로를 로그인 링크에서 생략
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
import { preventPointerDownFocus } from "@/lib/preventPointerDownFocus";
import { buildAuthFlowHref } from "@/features/auth/utils/redirect";

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
  const loginHref = buildAuthFlowHref("/login", callbackUrl);
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
      try {
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
        toast.success(
          "입력하신 이메일을 확인해 주세요. 재설정 안내가 가능한 계정이면 메일을 보냈습니다."
        );
      } catch {
        toast.error("재설정 메일 요청 중 일시적인 오류가 발생했습니다.");
      }
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<PasswordResetRequestSchema>(formErrors, setFocus);
  };

  return (
    <div className="flex flex-col gap-form-gap">
      {submitted && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand dark:text-brand-light">
          입력하신 이메일을 확인해 주세요. 재설정 안내가 가능한 계정이면 메일을
          보냈습니다. 이메일 인증을 완료한 계정만 비밀번호 찾기를 사용할 수
          있습니다.
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

        <p className="text-sm leading-relaxed text-muted">
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
          href={loginHref}
          onPointerDown={preventPointerDownFocus}
          className="focus-ring-soft rounded-md px-1 py-0.5 font-medium text-brand transition-colors hover:underline dark:text-brand-light"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
