/**
 * File Name : features/user/components/profile/ProfileEditForm.tsx
 * Description : 프로필 편집 폼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.25  임도헌   Created
 * 2024.11.25  임도헌   Modified  프로필 편집 폼 컴포넌트 추가
 * 2024.11.27  임도헌   Modified  GitHub 연동한 유저의 케이스 추가
 * 2024.11.28  임도헌   Modified  스키마 위치 변경
 * 2024.12.12  임도헌   Modified  스타일 수정
 * 2025.04.10  임도헌   Modified  전화번호 인증 기능 추가
 * 2025.10.08  임도헌   Modified  휴대폰 인증 로직 lib로 분리(sendProfilePhoneToken/verifyProfilePhoneToken)
 * 2025.12.12  임도헌   Modified  passwordToggle(Input) 도입 + submitting 가드 강화 + 전화번호 상태 원복 로직 보강
 * 2025.12.13  임도헌   Modified  phone은 인증 API에서만 변경, 인증 성공 시 router.refresh 제거(작성 중 내용 보호) + 안내 문구 추가
 * 2025.12.14  임도헌   Modified  phone 삭제 방지 UX 개선: onChange 즉시 차단 → onBlur에서만 원복 처리
 * 2025.12.14  임도헌   Modified  phone 정규화(trim) 및 resetForm이 originalPhone 기준으로 동작하도록 수정
 * 2025.12.23  임도헌   Modified  아바타 삭제 기능 및 UI 추가
 * 2025.12.23  임도헌   Modified  아바타 영역 레이아웃(w-1/2 기준 붕괴) 수정 + preview 없을 때 backgroundImage 제거
 * 2025.12.23  임도헌   Modified  window.confirm 제거 → ConfirmDialog 공용 모달로 변경
 * 2026.01.15  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용, 아바타/전화번호 UI 개선, 에러 핸들링 보강
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.25  임도헌   Modified  Cloudflare Images hash 하드코딩 제거
 * 2026.03.08  임도헌   Modified  FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반 커스텀 검증 UX 적용
 * 2026.03.09  임도헌   Modified  프로필 이미지 크롭/확대/위치 조정 모달 추가
 * 2026.03.12  임도헌   Modified  프로필 이미지 크롭 적용 절차와 검증 UX 흐름 명확화
 * 2026.03.12  임도헌   Modified  프로필 이미지 애니메이션 메타(avatarAnimated) 저장 지원
 * 2026.03.12  임도헌   Modified  프로필 편집 미리보기 아바타를 원형 컨테이너 기준으로 정렬해 사각형 노출 문제 수정
 * 2026.03.12  임도헌   Modified  인증 버튼과 안내/성공 상태 배경을 시맨틱 토큰 기준으로 통일
 * 2026.03.13  임도헌   Modified  저장/취소 시 returnTo 경로로 복귀할 수 있도록 보강
 * 2026.03.19  임도헌   Modified  작은 화면에서 전화번호 입력과 인증 버튼이 세로로 정렬되도록 조정해 폼 밀도를 완화
 * 2026.03.21  임도헌   Modified  방송국 전용 소개글 입력을 유저 채널 페이지로 이동
 * 2026.03.23  임도헌   Modified  프로필 편집 섹션 구분선과 안내 카드 셸을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.04.10  임도헌   Modified  profile 타이포 정책에 맞춰 전화번호 인증 CTA weight를 500 기준으로 정리
 * 2026.04.25  임도헌   Modified  서버 액션 prop 전달을 제거하고 소셜 유저 설정 안내의 다크모드 대비를 개선
 * 2026.04.26  임도헌   Modified  전화번호 인증 CTA의 다크모드 색조를 primary CTA 톤과 맞춰 정리
 * 2026.05.15  임도헌   Modified  이메일/비밀번호 설정 안내 박스의 다크모드 텍스트 대비 보강
 * 2026.06.01  임도헌   Modified  프로필 수정 폼 간격을 작성형 폼 기준으로 정리
 * 2026.06.01  임도헌   Modified  취소 시 내부 히스토리는 back으로 복귀하고 직접 진입은 replace fallback 처리
 */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MAX_PHOTO_SIZE, PASSWORD_MIN_LENGTH } from "@/lib/constants";
import {
  sendProfilePhoneTokenAction,
  verifyProfilePhoneTokenAction,
} from "@/features/user/actions/phone";
import {
  profileEditSchema,
  type ProfileEditDTO,
} from "@/features/user/schemas";
import type { CurrentUserForEdit } from "@/features/user/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import { toast } from "sonner";
import type { AvatarCropValues } from "@/features/user/utils/avatarCrop";
import { PhotoIcon } from "@heroicons/react/24/solid";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import { editProfileAction } from "@/features/user/actions/profile";
import { canUseBrowserBack } from "@/lib/navigationRefreshFlag";

const ConfirmDialog = dynamic(() => import("@/components/global/ConfirmDialog"), {
  loading: () => null,
});

const AvatarCropModal = dynamic(
  () => import("@/features/user/components/profile/AvatarCropModal"),
  {
    loading: () => null,
  }
);

interface ProfileEditFormProps {
  user: CurrentUserForEdit;
  returnTo: string;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * 프로필 편집 폼
 *
 * [기능]
 * 1. 기본 정보 수정: 닉네임, 아바타, 이메일(최초설정), 비밀번호(최초설정)
 * 2. 아바타 관리: 크롭/확대/위치 조정, 업로드(Cloudflare), 미리보기, 삭제
 * 3. 전화번호 인증: 인증번호 발송/검증 프로세스 내장 (수정 시 인증 필수)
 * 4. FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반 검증 UX 적용
 * 5. 서버 액션 연동: 클라이언트 내부에서 프로필 업데이트 액션 호출
 */
export default function ProfileEditForm({
  user,
  returnTo,
}: ProfileEditFormProps) {
  const router = useRouter();

  // --- State ---
  const [preview, setPreview] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(user.avatar);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [pendingImageName, setPendingImageName] = useState("avatar");
  const [applyingCrop, setApplyingCrop] = useState(false);

  // Phone Verification State
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(!!user.phone);
  const [phoneToken, setPhoneToken] = useState("");
  const [phoneVerificationError, setPhoneVerificationError] = useState("");

  // "현재 기준(원본)" phone: 인증 성공 시 즉시 갱신해서 가드 안정화
  const [originalPhone, setOriginalPhone] = useState((user.phone || "").trim());

  const [submitting, setSubmitting] = useState(false);
  const [avatarConfirmOpen, setAvatarConfirmOpen] = useState(false);

  // --- Schema ---
  // 소셜 가입 보완 항목과 전화번호 인증 상태에 따라 검증 스키마를 재구성
  const schema = useMemo(
    () =>
      profileEditSchema({
        needsEmailSetup: user.needsEmailSetup,
        needsPasswordSetup: user.needsPasswordSetup,
        hasVerifiedPhone: !!originalPhone,
      }),
    [user.needsEmailSetup, user.needsPasswordSetup, originalPhone]
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    watch,
    reset: rhfReset,
    clearErrors,
    formState: { errors },
  } = useForm<ProfileEditDTO>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: user.username,
      email: user.email ?? "",
      phone: (user.phone ?? "").trim(),
      avatar: user.avatar,
      avatarAnimated: user.avatarAnimated ?? false,
      password: null,
      confirmPassword: null,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const phoneValue = watch("phone");
  const normalizedPhone = (phoneValue || "").trim();
  const avatarValue = watch("avatar");
  // 기존 아바타, 새 미리보기, 폼 값을 함께 보고 삭제 버튼 노출 여부를 결정
  const hasAnyAvatar = !!currentPhoto || preview !== "" || !!avatarValue;

  // --- Effects ---

  // 전화번호 변경 감지: 수정 시 인증 해제
  useEffect(() => {
    if (normalizedPhone === originalPhone) {
      setPhoneVerified(!!originalPhone);
      setPhoneVerificationSent(false);
      setPhoneToken("");
      setPhoneVerificationError("");
      return;
    }
    setPhoneVerified(false);
    setPhoneVerificationSent(false);
  }, [normalizedPhone, originalPhone]);

  // Blob URL 정리
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // 초기 아바타 설정
  useEffect(() => {
    if (user.avatar) {
      setPreview(user.avatar + "/public");
      setCurrentPhoto(user.avatar);
      setValue("avatar", user.avatar);
      setValue("avatarAnimated", user.avatarAnimated ?? false);
    } else {
      setPreview("");
      setCurrentPhoto(null);
      setValue("avatar", null);
      setValue("avatarAnimated", false);
    }
  }, [user.avatar, user.avatarAnimated, setValue]);

  // --- Handlers ---

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    // 원본 파일은 바로 업로드하지 않고 크롭 모달에서 편집한 뒤 업로드 준비
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      setError("avatar", {
        type: "manual",
        message: "이미지 파일만 업로드할 수 있습니다.",
      });
      event.target.value = "";
      return;
    }

    if (nextFile.size > MAX_PHOTO_SIZE) {
      setError("avatar", {
        type: "manual",
        message: "이미지는 3MB 이하로 올려주세요.",
      });
      event.target.value = "";
      return;
    }

    const url = URL.createObjectURL(nextFile);
    setCropSourceUrl(url);
    setPendingImageName(nextFile.name);
    setCropModalOpen(true);
    clearErrors("avatar");
    event.target.value = "";
  };

  const applyAvatarFile = async (nextFile: File) => {
    // 크롭 결과 파일을 미리보기로 반영하고 Cloudflare direct upload URL을 예약
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);

    const url = URL.createObjectURL(nextFile);
    setPreview(url);
    setFile(nextFile);

    // Cloudflare Upload URL 요청
    const { getUploadUrl } = await import("@/lib/cloudflareImages");
    const res = await getUploadUrl();
    if (!res.success) {
      URL.revokeObjectURL(url);
      setPreview(user.avatar ? user.avatar + "/public" : "");
      setFile(null);
      setUploadUrl("");
      setValue("avatar", user.avatar ?? null);
      setValue("avatarAnimated", user.avatarAnimated ?? false);
      setError("avatar", {
        type: "manual",
        message: res.error ?? "업로드 URL을 가져오지 못했습니다.",
      });
      return;
    }

    const { id, uploadURL } = res.result;
    setUploadUrl(uploadURL);
    setValue("avatar", `https://imagedelivery.net/${CF_HASH}/${id}`);
    setValue("avatarAnimated", false);
  };

  const handleCropCancel = () => {
    if (cropSourceUrl.startsWith("blob:")) {
      URL.revokeObjectURL(cropSourceUrl);
    }
    setCropSourceUrl("");
    setPendingImageName("avatar");
    setCropModalOpen(false);
  };

  const handleCropConfirm = async (crop: AvatarCropValues) => {
    setApplyingCrop(true);
    try {
      const { createCroppedAvatarFile } = await import(
        "@/features/user/utils/avatarCrop"
      );
      const croppedFile = await createCroppedAvatarFile(
        cropSourceUrl,
        pendingImageName,
        crop
      );
      await applyAvatarFile(croppedFile);
      if (cropSourceUrl.startsWith("blob:")) {
        URL.revokeObjectURL(cropSourceUrl);
      }
      setCropSourceUrl("");
      setPendingImageName("avatar");
      setCropModalOpen(false);
    } catch (error) {
      console.error(error);
      setError("avatar", {
        type: "manual",
        message: "이미지 편집 중 오류가 발생했습니다.",
      });
    } finally {
      setApplyingCrop(false);
    }
  };

  const requestClearAvatar = () => {
    if (submitting) return;
    if (!hasAnyAvatar) return;
    setAvatarConfirmOpen(true);
  };

  const confirmClearAvatar = () => {
    if (submitting) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);

    setPreview("");
    setFile(null);
    setUploadUrl("");
    setCurrentPhoto(null);
    setValue("avatar", null, { shouldValidate: true, shouldDirty: true });
    setValue("avatarAnimated", false, {
      shouldValidate: false,
      shouldDirty: true,
    });
    clearErrors("avatar");
    if (fileInputRef.current) fileInputRef.current.value = "";

    setAvatarConfirmOpen(false);
    toast.success("아바타를 제거했습니다.");
  };

  const resetForm = () => {
    // RHF 값과 미리보기/업로드/전화번호 인증 파생 상태를 함께 원복
    const basePhone = originalPhone;
    rhfReset({
      username: user.username,
      email: user.email ?? "",
      phone: basePhone,
      avatar: user.avatar,
      avatarAnimated: user.avatarAnimated ?? false,
      password: null,
      confirmPassword: null,
    });

    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(user.avatar ? user.avatar + "/public" : "");
    setFile(null);
    setUploadUrl("");
    setCurrentPhoto(user.avatar);
    setValue("avatarAnimated", user.avatarAnimated ?? false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setPhoneVerificationSent(false);
    setPhoneToken("");
    setPhoneVerificationError("");
    setPhoneVerified(!!basePhone);
    setAvatarConfirmOpen(false);
  };

  const handleSendVerification = async () => {
    const normalized = (phoneValue || "").trim();
    if (!normalized) {
      setPhoneVerificationError("전화번호를 입력해주세요.");
      return;
    }
    try {
      const form = new FormData();
      form.append("phone", normalized);
      const res = await sendProfilePhoneTokenAction(form);
      if (res.success) {
        setPhoneVerificationSent(true);
        setPhoneVerificationError("");
        toast.info("인증번호가 발송되었습니다.");
      } else {
        setPhoneVerificationError(
          res.error || "인증 코드 전송에 실패했습니다."
        );
      }
    } catch {
      setPhoneVerificationError("인증 코드 전송 중 오류가 발생했습니다.");
    }
  };

  const handleVerifyToken = async () => {
    if (!phoneToken) {
      setPhoneVerificationError("인증 코드를 입력해주세요.");
      return;
    }
    const normalized = (phoneValue || "").trim();
    if (!normalized) {
      setPhoneVerificationError("전화번호를 입력해주세요.");
      return;
    }
    try {
      const form = new FormData();
      form.append("phone", normalized);
      form.append("token", phoneToken);
      const res = await verifyProfilePhoneTokenAction(form);
      if (res.success) {
        setPhoneVerified(true);
        setPhoneVerificationSent(false);
        setPhoneToken("");
        setPhoneVerificationError("");
        setOriginalPhone(normalized); // 인증 성공 시 원본 갱신
        setValue("phone", normalized, {
          shouldValidate: true,
          shouldDirty: false,
        });
        toast.success("전화번호 인증 완료!");
      } else {
        setPhoneVerificationError(res.error || "인증에 실패했습니다.");
      }
    } catch {
      setPhoneVerificationError("인증 중 오류가 발생했습니다.");
    }
  };

  // 폼 제출 핸들러 (유효성 검사 및 서버 액션 호출)
  const onValid = async (data: ProfileEditDTO) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // 1. 전화번호 인증 여부 확인 (변경 시 필수)
      const normalized = (data.phone || "").trim();
      if (normalized && normalized !== originalPhone && !phoneVerified) {
        setError("phone", {
          type: "manual",
          message: "전화번호 인증이 필요합니다.",
        });
        return;
      }

      // 2. 아바타 이미지 업로드 (File이 있으면 Cloudflare로 전송)
      if (file && !uploadUrl) {
        setError("avatar", {
          type: "manual",
          message: "이미지 업로드 준비 중입니다. 잠시 후 다시 시도해주세요.",
        });
        return;
      }
      if (file) {
        const cloudflareForm = new FormData();
        cloudflareForm.append("file", file);
        const response = await fetch(uploadUrl, {
          method: "POST",
          body: cloudflareForm,
        });
        if (!response.ok) {
          setError("avatar", {
            type: "manual",
            message: "이미지 업로드에 실패했습니다.",
          });
          return;
        }
      } else {
        data.avatar = currentPhoto; // 변경 없으면 기존 URL 유지
        data.avatarAnimated = currentPhoto
          ? (user.avatarAnimated ?? false)
          : false;
      }

      // 3. 서버 액션 호출 (FormData 구성)
      const fd = new FormData();
      fd.append("username", data.username);
      if (user.needsEmailSetup) fd.append("email", data.email ?? "");
      if (user.needsPasswordSetup) {
        if (data.password) fd.append("password", data.password);
        if (data.confirmPassword)
          fd.append("confirmPassword", data.confirmPassword);
      }
      fd.append("avatar", data.avatar ?? "");
      fd.append("avatarAnimated", String(data.avatarAnimated ?? false));

      const result = await editProfileAction(fd);

      if (!result.success) {
        // 전역 에러(formErrors)는 Toast로, 필드 에러(fieldErrors)는 Input 하단에 표시
        if (result.errors) {
          const formMsg = result.errors.formErrors?.[0];
          if (formMsg) toast.error(formMsg);

          applyFieldErrors<ProfileEditDTO>(
            setError,
            result.errors.fieldErrors,
            { setFocus }
          );
        }
        return;
      }

      toast.success("프로필 수정 완료!");
      router.replace(returnTo);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    let hasExternalReferrer = false;

    if (document.referrer) {
      try {
        hasExternalReferrer =
          new URL(document.referrer).origin !== window.location.origin;
      } catch {
        hasExternalReferrer = false;
      }
    }

    if (canUseBrowserBack() && !hasExternalReferrer) {
      router.back();
      return;
    }

    router.replace(returnTo);
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<ProfileEditDTO>(formErrors, setFocus);
  };
  // 소셜 가입처럼 이메일 또는 비밀번호가 비어 있는 계정의 보완 안내
  const showSetupNotice = user.needsEmailSetup || user.needsPasswordSetup;
  const phoneReg = register("phone");

  return (
    <div className="layout-container pt-page-y pb-24 px-page-x bg-background">
      <h1 className="mb-6 text-center text-2xl font-bold text-primary">
        프로필 수정
      </h1>

      {/* 아바타 업로드 영역 */}
      <div className="mb-6 flex flex-col items-center">
        <div className="relative group cursor-pointer">
          <label
            htmlFor="photo"
            className={cn(
              "relative flex size-24 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface-dim sm:size-28",
              "hover:border-brand/50 transition-colors",
              !preview && "text-muted"
            )}
          >
            {preview ? (
              <div
                className="absolute inset-0 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${preview})` }}
              />
            ) : (
              <PhotoIcon className="size-8" />
            )}
            {/* 오버레이 아이콘 */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <span className="text-white text-xs font-medium">변경</span>
            </div>
          </label>
          <input
            ref={fileInputRef}
            onChange={handleImageChange}
            type="file"
            id="photo"
            accept="image/*"
            className="hidden"
          />
        </div>

        {errors.avatar?.message && (
          <p className="mt-2 text-xs text-danger">{errors.avatar.message}</p>
        )}

        {hasAnyAvatar && (
          <button
            type="button"
            onClick={requestClearAvatar}
            disabled={submitting}
            className="focus-ring-soft mt-3 rounded-md text-xs text-muted hover:text-danger underline transition-colors"
          >
            아바타 삭제
          </button>
        )}
      </div>

      {/* 폼 영역 */}
      <form
        onSubmit={handleSubmit(onValid, onInvalid)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormErrorSummary errors={errors} />

        {/* 사용자 이름 */}
        <Input
          id="username"
          label="선원 닉네임"
          type="text"
          required
          placeholder="닉네임 (3~10자)"
          density="compact"
          {...register("username")}
          errors={[errors.username?.message ?? ""]}
          minLength={3}
          maxLength={10}
          aria-invalid={!!errors.username}
          icon={<UserIcon className="size-5" />}
        />

        {showSetupNotice && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm dark:border-amber-300/35 dark:bg-amber-950/70 dark:text-amber-100">
            원활한 서비스 이용을 위해 이메일과 비밀번호를 설정해주세요.
          </div>
        )}

        {/* 이메일 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-primary">이메일</label>
          {user.needsEmailSetup ? (
            <Input
              id="email"
              type="email"
              placeholder="이메일 주소"
              density="compact"
              {...register("email")}
              errors={[errors.email?.message ?? ""]}
              icon={<EnvelopeIcon className="size-5" />}
            />
          ) : (
            <div className="input-primary flex h-11 cursor-not-allowed items-center border border-border bg-surface-dim px-4 text-muted sm:h-input-md">
              <EnvelopeIcon className="size-5 mr-2" />
              {user.email ?? "미설정"}
              <span className="ml-auto text-xs">(변경 불가)</span>
            </div>
          )}
          {user.email && !user.emailVerified && (
            <p className="pl-1 text-xs leading-relaxed text-muted">
              이메일 인증을 완료해야 비밀번호 찾기와 계정 복구를 사용할 수
              있습니다.
            </p>
          )}
        </div>

        {/* 비밀번호 설정 */}
        {user.needsPasswordSetup && (
          <div className="mt-2 space-y-3 border-t border-border-subtle pt-2">
            <Input
              label="비밀번호 설정"
              type="password"
              passwordToggle
              placeholder="비밀번호"
              minLength={PASSWORD_MIN_LENGTH}
              density="compact"
              {...register("password")}
              errors={[errors.password?.message ?? ""]}
              icon={<LockClosedIcon className="size-5" />}
            />
            <Input
              type="password"
              passwordToggle
              placeholder="비밀번호 확인"
              minLength={PASSWORD_MIN_LENGTH}
              density="compact"
              {...register("confirmPassword")}
              errors={[errors.confirmPassword?.message ?? ""]}
              icon={<KeyIcon className="size-5" />}
            />
          </div>
        )}

        {/* 전화번호 인증 */}
        <div className="space-y-3 border-t border-border-subtle pt-3">
          <label className="text-sm font-medium text-primary">
            전화번호 (선택)
          </label>

          <div className="space-y-3 rounded-xl border border-border-subtle bg-surface p-3.5 shadow-sm sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="01012345678"
                  className="bg-transparent"
                  density="compact"
                  {...phoneReg}
                  errors={[errors.phone?.message ?? ""]}
                  icon={<PhoneIcon className="size-5" />}
                  onChange={(e) => {
                    phoneReg.onChange(e);
                  }}
                  onBlur={(e) => {
                    phoneReg.onBlur(e);
                    // 삭제 방지: 인증된 번호를 지우려 하면 원복
                    const v = e.target.value.trim();
                    if (!!originalPhone && v === "") {
                      setValue("phone", originalPhone);
                      toast.error("인증된 번호는 삭제할 수 없습니다.");
                    }
                  }}
                />
              </div>
              {normalizedPhone &&
                normalizedPhone !== originalPhone &&
                !phoneVerified && (
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={submitting}
                    className="focus-ring-strong h-11 w-full whitespace-nowrap rounded-xl bg-brand px-4 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50 sm:h-input-md sm:w-auto dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
                  >
                    인증 요청
                  </button>
                )}
            </div>

            {phoneVerificationSent && !phoneVerified && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="인증번호 6자리 입력"
                  value={phoneToken}
                  onChange={(e) => setPhoneToken(e.target.value)}
                  errors={[phoneVerificationError]}
                  inputMode="numeric"
                  maxLength={6}
                  className="text-center tracking-widest"
                  density="compact"
                />
                <button
                  type="button"
                  onClick={handleVerifyToken}
                  disabled={submitting}
                  className="focus-ring-strong h-11 w-full whitespace-nowrap rounded-xl bg-brand px-4 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-dark sm:h-input-md sm:w-auto dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
                >
                  확인
                </button>
              </div>
            )}

            {phoneVerified && (
              <div className="flex items-center gap-2 rounded-lg bg-brand/10 p-2 text-sm font-medium text-brand dark:bg-brand-light/10 dark:text-brand-light">
                <span>✓ 인증되었습니다.</span>
              </div>
            )}

            <div className="text-xs text-muted leading-relaxed">
   * 전화번호 변경은 인증 완료 시 즉시 저장
              <br />* 이미 인증된 번호는 삭제할 수 없습니다.
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-2 flex flex-col gap-3">
          <Button
            text={submitting ? "저장 중..." : "수정 완료"}
            disabled={submitting}
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="btn-secondary-page h-11 text-sm font-medium sm:h-12"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="btn-secondary-page flex h-11 items-center justify-center text-sm font-medium sm:h-12"
            >
              취소
            </button>
          </div>
        </div>
      </form>

      {/* 확인 다이얼로그 */}
      <ConfirmDialog
        open={avatarConfirmOpen}
        title="아바타 삭제"
        description="프로필 사진을 기본 이미지로 변경하시겠습니까?"
        confirmLabel="삭제"
        onConfirm={confirmClearAvatar}
        onCancel={() => setAvatarConfirmOpen(false)}
        loading={submitting}
      />

      <AvatarCropModal
        open={cropModalOpen}
        imageUrl={cropSourceUrl}
        onClose={handleCropCancel}
        onConfirm={handleCropConfirm}
        loading={applyingCrop}
      />
    </div>
  );
}
