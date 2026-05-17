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
 * 2026.03.08  임도헌   Modified  FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반의 커스텀 검증 UX 적용
 * 2026.03.12  임도헌   Modified  회원가입 폼의 커스텀 검증 UX와 서버 fieldErrors 처리 흐름 명확화
 * 2026.03.14  임도헌   Modified  회원가입 성공 후 callbackUrl/온보딩 판단을 포함한 서버 redirectTo 규칙으로 replace 복귀하도록 정리
 * 2026.03.23  임도헌   Modified  회원가입 폼 내 소셜 로그인 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.25  임도헌   Modified  반복적인 입력 필드를 두 묶음으로 나눠 가입 흐름의 리듬을 정리하고 소셜 구분선을 통일
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 가입 화면 보조 링크 타이포 무게를 정리
 * 2026.04.13  임도헌   Modified  회원가입 입력 필드에 명시적 라벨을 추가해 접근성 문맥을 보강
 * 2026.05.12  임도헌   Modified  로그인 이동 링크가 blur 검증으로 한 번 막히지 않도록 포인터 focus 이동 방지
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
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import SocialLogin from "@/features/auth/components/SocialLogin";
import { submitCreateAccount } from "@/features/auth/actions/register";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import { preventPointerDownFocus } from "@/lib/preventPointerDownFocus";

type FormData = CreateAccountSchema;

/**
 * 회원가입 폼
 * - 닉네임/이메일/비밀번호 입력 및 검증
 * - FormErrorSummary 기반 상단 에러 요약 노출
 * - 서버 fieldErrors를 Input 하단 에러와 첫 필드 포커스로 연결
 * - 중복 검사 결과 처리 및 가입 액션 호출
 *
 * @param {Object} props - 컴포넌트 속성
 * @param {string} [props.callbackUrl] - 회원가입 완료 후 복귀할 내부 경로
 */
export default function CreateAccountForm({
  callbackUrl = "/profile",
}: {
  callbackUrl?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setFocus,
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
        formData.append("callbackUrl", callbackUrl);

        // 1. 서버 액션 호출
        const result = await submitCreateAccount(null, formData);

        if (!result.success) {
          // 2. 필드 에러 처리 (닉네임/이메일 중복 등)
          if (result.fieldErrors) {
            applyFieldErrors<FormData>(setError, result.fieldErrors, {
              setFocus,
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
      <FormErrorSummary errors={errors} />

      <div className="flex flex-col gap-form-gap">
        <div className="flex flex-col gap-form-gap">
          <Input
            {...register("username")}
            label="선원 닉네임"
            placeholder="선원 닉네임"
            autoComplete="username"
            icon={<UserIcon className="size-5" />}
            errors={errors.username?.message ? [errors.username.message] : []}
          />
          <Input
            {...register("email")}
            label="이메일 주소"
            type="email"
            placeholder="이메일 주소"
            autoComplete="email"
            icon={<EnvelopeIcon className="size-5" />}
            errors={errors.email?.message ? [errors.email.message] : []}
          />
        </div>

        <div className="flex flex-col gap-form-gap pt-1.5">
          <Input
            {...register("password")}
            label="비밀번호"
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
            label="비밀번호 확인"
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
      </div>

      <Button
        text={isPending ? "등록 중..." : "선원 등록하기"}
        disabled={isPending}
        className="mt-2"
      />

      <div className="mt-4 text-center text-sm text-muted">
        이미 선원이신가요?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          onPointerDown={preventPointerDownFocus}
          className="focus-ring-soft rounded-md px-1 py-0.5 font-medium text-brand transition-colors hover:underline dark:text-brand-light"
        >
          항해 시작하기
        </Link>
      </div>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-subtle" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted">또는 간편하게</span>
        </div>
      </div>

      <SocialLogin callbackUrl={callbackUrl} />
    </form>
  );
}
