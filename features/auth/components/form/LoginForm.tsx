/**
 * File Name : features/auth/components/form/LoginForm.tsx
 * Description : 유저 로그인 폼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  로그인 폼 컴포넌트로 분리
 * 2025.06.07  임도헌   Modified  toast및 router.push로 페이지 이동
 * 2025.12.09  임도헌   Modified  클라이언트 검증 모드(onBlur/onChange) 및 에러 표시 방식 개선
 * 2025.12.10  임도헌   Modified  서버 액션 결과 타입(success/fieldErrors) 반영 및 예외 처리/autoComplete 개선
 * 2025.12.12  임도헌   Modified  password 표시/숨기기 버튼을 Input(passwordToggle)로 위임하여 중복 UI 제거
 * 2026.01.10  임도헌   Modified  변경된 UI 컴포넌트 및 간격 적용
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 */
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";
import SocialLogin from "@/features/auth/components/SocialLogin";
import { loginSchema, type LoginSchema } from "@/features/auth/lib/loginSchema";
import { login } from "@/app/(auth)/login/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/solid";

type FormData = LoginSchema;

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", data.email);
        formData.append("password", data.password);

        const result = await login(undefined, formData);

        if (!result.success) {
          const fieldErrors = result.fieldErrors as Partial<
            Record<keyof FormData, string[]>
          >;
          (Object.keys(fieldErrors) as (keyof FormData)[]).forEach((key) => {
            const message = fieldErrors[key]?.[0];
            if (message) setError(key, { message });
          });
          return;
        }

        toast.success("돌아오신 것을 환영합니다! ⚓");
        router.push(callbackUrl);
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
          autoComplete="current-password"
          icon={<LockClosedIcon className="size-5" />}
          errors={errors.password?.message ? [errors.password.message] : []}
        />
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <Button
          text={isPending ? "로그인 중..." : "로그인"}
          disabled={isPending}
        />

        <div className="text-center text-sm text-muted">
          계정이 없으신가요?{" "}
          <Link
            href="/create-account"
            className="font-semibold text-brand dark:text-brand-light hover:underline transition-colors"
          >
            회원가입 하기
          </Link>
        </div>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted">
            또는 다른 방법으로
          </span>
        </div>
      </div>

      <SocialLogin />
    </form>
  );
}
