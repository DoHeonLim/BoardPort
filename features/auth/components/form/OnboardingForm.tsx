/**
 * File Name : features/auth/components/form/OnboardingForm.tsx
 * Description : 인증 직후 최소 프로필/지역 설정 온보딩 폼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   신규/미완성 계정이 지역, 닉네임, 이메일을 최소 입력하고 서비스로 진입하도록 온보딩 폼 추가
 * 2026.03.14  임도헌   Modified  이메일은 선택 보완으로 낮추고 지역/임시 닉네임 중심의 강제 온보딩으로 조정
 * 2026.03.19  임도헌   Modified  hidden 좌표 필드의 빈 값이 NaN으로 변환되지 않도록 온보딩 지역 검증 흐름 보강
 * 2026.03.22  임도헌   Modified  지역 선택 직후 중간 검증 잔상 에러가 남지 않도록 hidden 필드 업데이트/재검증 순서를 정리
 * 2026.03.25  임도헌   Modified  소셜 자동 생성 닉네임 강제 보완 여부를 hidden flag로 action에 함께 전달
 * 2026.03.25  임도헌   Modified  선택 이메일은 상단 에러 요약에서 제외하고 활동 지역 액션 라벨을 더 조용하게 정리
 * 2026.04.02  임도헌   Modified  온보딩 폼 JSDoc 보강
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 온보딩 도움 문구와 지역 액션 타이포를 정리
 * 2026.05.12  임도헌   Modified  지역 선택 버튼이 blur 검증으로 한 번 막히지 않도록 포인터 focus 이동 방지
 * 2026.05.19  임도헌   Modified  서버 액션 예외 시 pending 해제 후 토스트로 안내되도록 에러 처리 보강
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EnvelopeIcon, MapPinIcon, UserIcon } from "@heroicons/react/24/solid";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import NeighborhoodSearchModal from "@/features/user/components/profile/NeighborhoodSearchModal";
import { completeOnboardingAction } from "@/features/auth/actions/onboarding";
import {
  onboardingSchema,
  type OnboardingSchema,
} from "@/features/auth/schemas/onboarding";
import type { AuthOnboardingState } from "@/features/auth/types";
import type { LocationData } from "@/features/map/types";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import { preventPointerDownFocus } from "@/lib/preventPointerDownFocus";

type FormValues = Partial<OnboardingSchema>;

/**
 * 인증 직후 최소 프로필/지역 보완 폼
 *
 * [기능]
 * - 현재 계정 상태에 따라 필요한 항목만 노출하는 동적 온보딩 스키마 적용
 * - 유저명, 선택 이메일, 활동 지역 입력을 서버 액션과 같은 규칙으로 검증
 * - 활동 지역은 모달에서 선택한 값을 hidden 필드에 동기화해 제출
 * - 저장 성공 후 원래 진입하려던 내부 경로로 복귀
 *
 * @param onboarding - 현재 계정의 온보딩 필요 상태
 * @param next - 온보딩 완료 후 이동할 안전한 내부 경로
 * @param forceUsernameSetup - 자동 생성 닉네임 보완 강제 여부
 */
export default function OnboardingForm({
  onboarding,
  next,
  forceUsernameSetup,
}: {
  onboarding: AuthOnboardingState;
  next: string;
  forceUsernameSetup: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const schema = useMemo(
    () =>
      onboardingSchema({
        needsUsernameSetup: onboarding.needsUsernameSetup,
        needsLocationSetup: onboarding.needsLocationSetup,
      }),
    [onboarding.needsLocationSetup, onboarding.needsUsernameSetup]
  );

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    setFocus,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      username: onboarding.username,
      email: onboarding.email ?? "",
      locationName: onboarding.locationName ?? "",
      region1: onboarding.region1 ?? "",
      region2: onboarding.region2 ?? "",
      region3: onboarding.region3 ?? "",
      latitude: onboarding.latitude ?? undefined,
      longitude: onboarding.longitude ?? undefined,
    },
  });

  const locationName = watch("locationName");
  const locationError = errors.locationName?.message;
  const emailError = errors.email?.message;
  // 선택 이메일은 강제 온보딩 항목이 아니라 상단 요약에서는 제외
  const summaryErrors = onboarding.needsEmailSetup
    ? { ...errors, email: undefined }
    : errors;

  const handleLocationSelect = (location: LocationData) => {
    // hidden 필드를 한 번에 갱신한 뒤 최종 상태로 다시 검증해
    // 첫 선택 순간 중간 값 검증으로 남는 location 오류 잔상 방지
    const commonOptions = {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    } as const;

    setValue("locationName", location.locationName, commonOptions);
    setValue("region1", location.region1, commonOptions);
    setValue("region2", location.region2, commonOptions);
    setValue("region3", location.region3, commonOptions);
    setValue("latitude", location.latitude, commonOptions);
    setValue("longitude", location.longitude, commonOptions);
    clearErrors("locationName");
    void trigger([
      "locationName",
      "region1",
      "region2",
      "region3",
      "latitude",
      "longitude",
    ]);
    setIsLocationModalOpen(false);
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();

        if (forceUsernameSetup) {
          // 소셜 자동 생성 닉네임 보완 여부를 action에서 다시 판단할 수 있도록 전달
          formData.append("forceUsernameSetup", "1");
        }

        if (onboarding.needsUsernameSetup && data.username) {
          formData.append("username", data.username);
        }
        if (onboarding.needsEmailSetup && data.email) {
          formData.append("email", data.email);
        }
        if (onboarding.needsLocationSetup) {
          formData.append("locationName", data.locationName ?? "");
          formData.append("region1", data.region1 ?? "");
          formData.append("region2", data.region2 ?? "");
          formData.append("region3", data.region3 ?? "");
          formData.append("latitude", String(data.latitude ?? ""));
          formData.append("longitude", String(data.longitude ?? ""));
        }

        const result = await completeOnboardingAction(formData);

        if (!result.success) {
          if (result.fieldErrors) {
            applyFieldErrors<FormValues>(setError, result.fieldErrors, {
              setFocus,
            });
          }
          if (result.error) {
            toast.error(result.error);
          }
          return;
        }

        toast.success(
          "항해 준비가 완료되었습니다. 바로 서비스를 이용해보세요."
        );
        router.replace(next);
      } catch {
        toast.error("온보딩 저장 중 일시적인 오류가 발생했습니다.");
      }
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<FormValues>(formErrors, setFocus);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col gap-form-gap"
        noValidate
      >
        <FormErrorSummary errors={summaryErrors} />

        {onboarding.needsUsernameSetup && (
          <Input
            {...register("username")}
            label="선원 닉네임"
            placeholder="항해에 사용할 닉네임"
            autoComplete="username"
            icon={<UserIcon className="size-5" />}
            errors={errors.username?.message ? [errors.username.message] : []}
          />
        )}

        {onboarding.needsEmailSetup && (
          <div className="flex flex-col gap-1.5">
            <Input
              {...register("email")}
              label="이메일 주소 (선택)"
              type="email"
              placeholder="계정에 연결할 이메일 (선택)"
              autoComplete="email"
              icon={<EnvelopeIcon className="size-5" />}
              errors={emailError ? [emailError] : []}
            />
            {!emailError && (
              <p className="pl-1 text-sm leading-relaxed text-muted">
                선택 항목입니다. 나중에 비밀번호 찾기와 계정 복구에 사용할 수
                있습니다.
              </p>
            )}
          </div>
        )}

        {onboarding.needsLocationSetup && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-primary">활동 지역</p>
            <button
              type="button"
              onPointerDown={preventPointerDownFocus}
              onClick={() => setIsLocationModalOpen(true)}
              className="focus-ring-soft flex min-h-[56px] items-center justify-between rounded-xl border border-border bg-surface px-4 text-left transition-colors hover:bg-surface-dim"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-full bg-surface-dim p-2 text-brand">
                  <MapPinIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {locationName || "내 동네 선택하기"}
                  </p>
                  <p className="text-xs text-muted">
                    상품, 게시글, 방송 노출 범위의 기준이 됩니다.
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-muted">
                {locationName ? "변경" : "선택"}
              </span>
            </button>
            {locationError && (
              <span className="pl-1 text-xs font-medium text-danger">
                {locationError}
              </span>
            )}

            <input type="hidden" {...register("locationName")} />
            <input type="hidden" {...register("region1")} />
            <input type="hidden" {...register("region2")} />
            <input type="hidden" {...register("region3")} />
            <input
              type="hidden"
              {...register("latitude", {
                setValueAs: (value) =>
                  value === "" || value == null ? undefined : Number(value),
              })}
            />
            <input
              type="hidden"
              {...register("longitude", {
                setValueAs: (value) =>
                  value === "" || value == null ? undefined : Number(value),
              })}
            />
          </div>
        )}

        <Button
          text={isPending ? "저장 중..." : "항해 시작하기"}
          disabled={isPending}
          className="mt-2"
        />
      </form>

      {isLocationModalOpen && (
        <NeighborhoodSearchModal
          onClose={() => setIsLocationModalOpen(false)}
          onSelect={handleLocationSelect}
        />
      )}
    </>
  );
}
