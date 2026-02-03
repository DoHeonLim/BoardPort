/**
 * File Name : features/auth/components/form/CreateAccountForm.tsx
 * Description : 유저 회원가입 폼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  회원가입 폼 컴포넌트로 분리
 * 2025.06.07  임도헌   Modified  toast및 router.push로 페이지 이동
 * 2025.12.09  임도헌   Modified  클라이언트 검증 모드(onBlur/onChange) 및 에러 메시지 표시 방식 개선
 * 2025.12.10  임도헌   Modified  서버 액션 결과 처리 방식 통일, 예외 토스트 추가 및 autoComplete/에러 전달 로직 개선
 * 2025.12.12  임도헌   Modified  password 표시/숨기기 버튼을 Input(passwordToggle)로 위임하여 중복 UI 제거
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 & 아이콘 적용
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.01.20  임도헌   Modified  전역 에러(toast) 처리 추가
 * 2026.01.25  임도헌   Modified  주석 보강
 */
"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  EnvelopeIcon,
  KeyIcon,
  LockClosedIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import {
  createAccountSchema,
  type CreateAccountSchema,
} from "@/features/auth/schemas/register";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SocialLogin from "@/features/auth/components/SocialLogin";
import { submitCreateAccount } from "@/features/auth/actions/register";

type FormData = CreateAccountSchema;

/**
 * 회원가입 폼
 * - 닉네임/이메일/비밀번호 입력 및 검증
 * - 중복 검사 결과 처리 및 가입 액션 호출
 */
export default function CreateAccountForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(createAccountSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("username", data.username);
        formData.append("email", data.email);
        formData.append("password", data.password);
        formData.append("confirmPassword", data.confirmPassword);

        // 1. 서버 액션 호출
        const result = await submitCreateAccount(null, formData);

        if (!result.success) {
          // 2. 필드 에러 처리 (닉네임/이메일 중복 등)
          if (result.fieldErrors) {
            const fieldErrors = result.fieldErrors as Partial<
              Record<keyof FormData, string[]>
            >;
            (Object.keys(fieldErrors) as (keyof FormData)[]).forEach((key) => {
              const message = fieldErrors[key]?.[0];
              if (message) setError(key, { message });
            });
          }
          // 3. 전역 에러 처리
          if (result.error) {
            toast.error(result.error);
          }
          return;
        }

        // 4. 성공 시 이동
        toast.success("환영합니다! 선원 등록이 완료되었습니다.");
        router.push("/profile");
      } catch {
        toast.error("일시적인 오류가 발생했습니다.");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-form-gap"
    >
      <div className="flex flex-col gap-form-gap">
        <Input
          {...register("username")}
          placeholder="선원 닉네임"
          autoComplete="username"
          icon={<UserIcon className="size-5" />}
          errors={errors.username?.message ? [errors.username.message] : []}
        />
        <Input
          {...register("email")}
          type="email"
          placeholder="이메일 주소"
          autoComplete="email"
          icon={<EnvelopeIcon className="size-5" />}
          errors={errors.email?.message ? [errors.email.message] : []}
        />
        <Input
          {...register("password")}
          type="password"
          passwordToggle
          placeholder="비밀번호"
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          icon={<LockClosedIcon className="size-5" />}
          errors={errors.password?.message ? [errors.password.message] : []}
        />
        <Input
          {...register("confirmPassword")}
          type="password"
          passwordToggle
          placeholder="비밀번호 확인"
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          icon={<KeyIcon className="size-5" />}
          passwordToggleLabels={{
            show: "비밀번호 확인 표시",
            hide: "비밀번호 확인 숨기기",
          }}
          errors={
            errors.confirmPassword?.message
              ? [errors.confirmPassword.message]
              : []
          }
        />
      </div>

      <Button
        text={isPending ? "등록 중..." : "선원 등록하기"}
        disabled={isPending}
        className="mt-2"
      />

      <div className="mt-4 text-center text-sm text-muted">
        이미 선원이신가요?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand dark:text-brand-light hover:underline transition-colors"
        >
          항해 시작하기
        </Link>
      </div>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted">또는</span>
        </div>
      </div>

      <SocialLogin />
    </form>
  );
}
