/**
 * File Name : features/auth/components/form/SmsForm.tsx
 * Description : SMS 로그인/인증 폼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  SMS 로그인 폼 컴포넌트로 분리
 * 2025.06.05  임도헌   Modified  버튼 클릭 시 아무 반응 없던 것 수정. (z.object로 감싸니 작동)
 * 2025.06.07  임도헌   Modified  toast및 router.push로 페이지 이동
 * 2025.12.12  임도헌   Modified  서버 액션(success/error) 구조에 맞춰 에러 표시 로직 정리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 & 아이콘 적용
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.01.20  임도헌   Modified  ActionState 타입 대응 (result.success 체크)
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.03.08  임도헌   Modified  FormErrorSummary, noValidate, focusFirstFieldError 기반의 커스텀 검증 UX 적용
 * 2026.03.12  임도헌   Modified  callbackUrl 복귀 경로를 지원하도록 보강
 * 2026.03.14  임도헌   Modified  인증 성공 후 복귀를 replace로 정리해 SMS 화면이 히스토리에 남지 않도록 보강
 * 2026.03.14  임도헌   Modified  토큰 단계에서 인증번호 재전송 버튼을 제공해 전화번호 재입력 없이 재시도할 수 있도록 보강
 * 2026.03.14  임도헌   Modified  인증 성공 시 온보딩 필요 여부를 서버 redirectTo 규칙으로 통일
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 SMS 인증 안내와 액션 링크 타이포를 정리
 * 2026.05.12  임도헌   Modified  토큰 단계 보조 액션이 blur 검증으로 한 번 막히지 않도록 처리
 * 2026.05.19  임도헌   Modified  서버 액션 예외 처리와 SMS 자동완성 힌트 보강
 */

// react-hook-form에 사용되는 schema가 z.object가 아닌 단일 필드라서 전체 폼 검증이 무효화됨.
// react-hook-form은 zodResolver에서 z.object({}) 구조만 허용
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChatBubbleBottomCenterTextIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/solid";
import { phoneSchema, tokenSchema } from "@/features/auth/schemas/sms";
import Button from "@/components/ui/Button";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import Input from "@/components/ui/Input";
import { sendPhoneToken, verifyPhoneToken } from "@/features/auth/actions/sms";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import { preventPointerDownFocus } from "@/lib/preventPointerDownFocus";

type Phase = "phone" | "token";
type FormValues = { phone?: string; token?: string };

/**
 * SMS 로그인/인증 폼
 * - Phase 1: 전화번호 입력 및 인증번호 발송 요청
 * - Phase 2: 인증번호 입력 및 검증 (로그인)
 * - FormErrorSummary와 첫 에러 포커스 이동 적용
 */
export default function SmsForm({
  callbackUrl = "/profile",
}: {
  callbackUrl?: string;
}) {
  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // 단계별 동적 스키마 적용 (Phase 1: Phone, Phase 2: Token)
  const schema = z.object(
    phase === "phone" ? { phone: phoneSchema } : { token: tokenSchema }
  );

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const onSubmit = (data: FormValues) => {
    setFormError(null);
    startTransition(async () => {
      try {
        // 1. 전화번호 전송 단계
        if (phase === "phone" && data.phone) {
          const formData = new FormData();
          formData.append("phone", data.phone);
          const res = await sendPhoneToken(formData);

          if (!res.success) {
            setFormError(res.error || "알 수 없는 오류가 발생했습니다.");
          } else {
            setPhone(data.phone);
            setPhase("token"); // 다음 단계로 전환
            toast.success("인증번호가 발송되었습니다. 📨");
            reset(); // 입력 필드 초기화 (토큰 입력 준비)
          }
        }

        // 2. 토큰 검증 단계
        if (phase === "token" && data.token && phone) {
          const formData = new FormData();
          formData.append("token", data.token);
          formData.append("phone", phone);
          formData.append("callbackUrl", callbackUrl);
          const res = await verifyPhoneToken(formData);

          if (!res.success) {
            setFormError(res.error || "알 수 없는 오류가 발생했습니다.");
          } else {
            toast.success("인증 성공! 항해를 시작합니다. ⚓");
            router.replace(res.redirectTo ?? callbackUrl);
          }
        }
      } catch {
        setFormError("SMS 인증 처리 중 일시적인 오류가 발생했습니다.");
      }
    });
  };

  const handleResendToken = () => {
    if (!phone) return;

    setFormError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("phone", phone);
        const res = await sendPhoneToken(formData);

        if (!res.success) {
          setFormError(res.error || "인증번호 재전송에 실패했습니다.");
          return;
        }

        toast.success("인증번호를 다시 발송했습니다. 📨");
        reset({ token: "" });
        setFocus("token");
      } catch {
        setFormError("인증번호 재전송 중 일시적인 오류가 발생했습니다.");
      }
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<FormValues>(formErrors, setFocus);
  };

  const getErrorMsg = (fieldError: string | undefined, phaseError: boolean) => {
    if (fieldError) return [fieldError];
    if (phaseError && formError) return [formError];
    return [];
  };

  const phoneError = getErrorMsg(errors.phone?.message, phase === "phone");
  const tokenError = getErrorMsg(errors.token?.message, phase === "token");

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="flex flex-col gap-form-gap"
      noValidate
    >
      <FormErrorSummary errors={errors} />

      {phase === "phone" ? (
        <div className="flex flex-col gap-form-gap">
          <Input
            {...register("phone")}
            type="tel"
            placeholder="휴대폰 번호 (- 없이 입력)"
            autoComplete="tel"
            errors={phoneError}
            required
            icon={<DevicePhoneMobileIcon className="size-5" />}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-form-gap">
          <div className="mb-2 text-center text-sm leading-relaxed text-muted">
            <span className="font-medium text-brand dark:text-brand-light">
              {phone}
            </span>
            로 전송된
            <br />
            6자리 인증번호를 입력해주세요.
          </div>
          <Input
            {...register("token")}
            type="number"
            placeholder="인증번호 6자리"
            autoComplete="one-time-code"
            min={100000}
            max={999999}
            errors={tokenError}
            required
            icon={<ChatBubbleBottomCenterTextIcon className="size-5" />}
          />
        </div>
      )}

      <div className="flex flex-col gap-4 mt-2">
        <Button
          text={
            isPending
              ? "처리 중..."
              : phase === "phone"
              ? "인증번호 받기"
              : "인증하기"
          }
          disabled={isPending}
        />

        {phase === "token" && (
          <div className="flex items-center justify-center gap-4 text-center">
            <button
              type="button"
              onPointerDown={preventPointerDownFocus}
              onClick={handleResendToken}
              disabled={isPending}
              className="focus-ring-soft rounded-md px-1.5 py-1 text-sm font-medium text-brand underline-offset-4 transition-colors hover:underline disabled:opacity-60 dark:text-brand-light"
            >
              인증번호 재전송
            </button>
            <button
              type="button"
              onPointerDown={preventPointerDownFocus}
              onClick={() => {
                setPhase("phone");
                setFormError(null);
              }}
              className="focus-ring-soft rounded-md px-1.5 py-1 text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-brand dark:hover:text-brand-light"
            >
              전화번호 다시 입력하기
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
