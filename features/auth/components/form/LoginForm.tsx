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
 * 2026.01.20  임도헌   Modified  전역 에러 처리 추가
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.03.08  임도헌   Modified  소셜 로그인 콜백 에러를 초기 안내 배너와 토스트로 표시
 * 2026.03.08  임도헌   Modified  소셜 로그인 callbackUrl 전달 및 FormErrorSummary/applyFieldErrors/focusFirstFieldError 기반 커스텀 검증 UX 적용
 * 2026.03.12  임도헌   Modified  FormErrorSummary와 공통 fieldErrors 매핑 기반 검증 UX 흐름 명확화
 * 2026.03.14  임도헌   Modified  로그인 성공 후 복귀를 replace로 정리해 인증 화면이 히스토리에 남지 않도록 보강
 * 2026.03.15  임도헌   Modified  로그인 화면에서 이메일 로그인 우선 흐름을 위해 소셜 로그인 버튼을 폼 하단으로 재배치
 * 2026.03.14  임도헌   Modified  로그인 성공 시 온보딩 필요 여부를 서버가 결정한 redirectTo로 복귀하도록 보강
 * 2026.03.18  임도헌   Modified  비밀번호 찾기 링크에도 callbackUrl을 전달해 재로그인 시 원래 목적지 복귀 문맥 유지
 * 2026.03.23  임도헌   Modified  로그인 폼 내 소셜 로그인 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.25  임도헌   Modified  인증 도움 링크와 소셜 섹션 위계를 다듬어 기본 로그인 흐름이 먼저 읽히도록 정리
 */
"use client";

import { useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import SocialLogin from "@/features/auth/components/SocialLogin";
import { login } from "@/features/auth/actions/login";
import { loginSchema, type LoginSchema } from "@/features/auth/schemas/login";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";

type FormData = LoginSchema;

/**
 * 로그인 폼
 * - 이메일/비밀번호 검증 및 로그인 액션 처리
 * - 초기 소셜 로그인 에러 배너 및 토스트 표시
 * - FormErrorSummary와 첫 에러 포커스 이동 적용
 * - 소셜 로그인 연동
 */
export default function LoginForm({
  callbackUrl,
  initialErrorMessage,
}: {
  callbackUrl: string;
  initialErrorMessage?: string;
}) {
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur", // UX: 입력 중엔 에러 숨기고 포커스 이동 시 검증
    reValidateMode: "onChange",
  });

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hasShownInitialErrorRef = useRef(false);

  useEffect(() => {
    if (!initialErrorMessage || hasShownInitialErrorRef.current) return;
    hasShownInitialErrorRef.current = true;
    toast.error(initialErrorMessage);
  }, [initialErrorMessage]);

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", data.email);
        formData.append("password", data.password);
        formData.append("callbackUrl", callbackUrl);

        // 1. 서버 액션 호출
        const result = await login(undefined, formData);

        if (!result.success) {
          // 2. 필드 에러 처리 (Zod 검증 실패 등 특정 필드에 매핑)
          if (result.fieldErrors) {
            applyFieldErrors<FormData>(setError, result.fieldErrors, {
              setFocus,
            });
          }
          // 3. 전역 에러 처리 (계정 없음, 비밀번호 불일치 등)
          if (result.error) {
            toast.error(result.error);
          }
          return;
        }

        // 4. 성공 처리
        toast.success("돌아오신 것을 환영합니다! ⚓");
        router.replace(result.redirectTo ?? callbackUrl);
      } catch {
        toast.error("일시적인 오류가 발생했습니다.");
      }
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<FormData>(formErrors, setFocus);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="flex flex-col gap-form-gap"
      noValidate
    >
      {initialErrorMessage && (
        <div className="rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-2.5 text-sm text-danger dark:bg-danger/[0.08]">
          {initialErrorMessage}
        </div>
      )}

      <FormErrorSummary errors={errors} />

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

      <div className="-mt-0.5 text-right">
        <Link
          href={`/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="mt-2 flex flex-col gap-3.5">
        <Button
          text={isPending ? "로그인 중..." : "로그인"}
          disabled={isPending}
        />

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-subtle" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted">또는 간편하게</span>
          </div>
        </div>

        <SocialLogin callbackUrl={callbackUrl} />

        <div className="pt-1 text-center text-sm text-muted">
          계정이 없으신가요?{" "}
          <Link
            href={`/create-account?callbackUrl=${encodeURIComponent(
              callbackUrl
            )}`}
            className="font-semibold text-brand dark:text-brand-light hover:underline transition-colors"
          >
            회원가입 하기
          </Link>
        </div>
      </div>
    </form>
  );
}
