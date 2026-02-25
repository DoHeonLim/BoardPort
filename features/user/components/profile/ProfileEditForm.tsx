/**
 * File Name : features/user/components/profile/ProfileEditForm.tsx
 * Description : 프로필 편집 폼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.25  임도헌   Created
 * 2024.11.25  임도헌   Modified  프로필 편집 폼 컴포넌트추가
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
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MAX_PHOTO_SIZE } from "@/lib/constants";
import { getUploadUrl } from "@/lib/cloudflareImages";
import {
  sendProfilePhoneTokenAction,
  verifyProfilePhoneTokenAction,
} from "@/features/user/actions/phone";
import {
  profileEditSchema,
  type ProfileEditDTO,
} from "@/features/user/schemas";
import type {
  EditProfileActionState,
  CurrentUserForEdit,
} from "@/features/user/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import { PhotoIcon } from "@heroicons/react/24/solid";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type EditProfileAction = (
  formData: FormData
) => Promise<EditProfileActionState>;

interface ProfileEditFormProps {
  user: CurrentUserForEdit;
  action: EditProfileAction;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * 프로필 편집 폼
 *
 * [기능]
 * 1. 기본 정보 수정: 닉네임, 아바타, 이메일(최초설정), 비밀번호(최초설정)
 * 2. 아바타 관리: 업로드(Cloudflare), 미리보기, 삭제
 * 3. 전화번호 인증: 인증번호 발송/검증 프로세스 내장 (수정 시 인증 필수)
 * 4. 서버 액션 연동: 중복 체크 및 업데이트 처리
 */
export default function ProfileEditForm({
  user,
  action,
}: ProfileEditFormProps) {
  const router = useRouter();

  // --- State ---
  const [preview, setPreview] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(user.avatar);

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
      password: null,
      confirmPassword: null,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const phoneValue = watch("phone");
  const normalizedPhone = (phoneValue || "").trim();
  const avatarValue = watch("avatar");
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
    } else {
      setPreview("");
      setCurrentPhoto(null);
      setValue("avatar", null);
    }
  }, [user.avatar, setValue]);

  // --- Handlers ---

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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

    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);

    const url = URL.createObjectURL(nextFile);
    setPreview(url);
    setFile(nextFile);

    // Cloudflare Upload URL 요청
    const res = await getUploadUrl();
    if (!res.success) {
      URL.revokeObjectURL(url);
      setPreview(user.avatar ? user.avatar + "/public" : "");
      setFile(null);
      setUploadUrl("");
      setValue("avatar", user.avatar ?? null);
      setError("avatar", {
        type: "manual",
        message: res.error ?? "업로드 URL을 가져오지 못했습니다.",
      });
      event.target.value = "";
      return;
    }

    const { id, uploadURL } = res.result;
    setUploadUrl(uploadURL);
    setValue("avatar", `https://imagedelivery.net/${CF_HASH}/${id}`);
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
    clearErrors("avatar");
    if (fileInputRef.current) fileInputRef.current.value = "";

    setAvatarConfirmOpen(false);
    toast.success("아바타를 제거했습니다.");
  };

  const resetForm = () => {
    const basePhone = originalPhone;
    rhfReset({
      username: user.username,
      email: user.email ?? "",
      phone: basePhone,
      avatar: user.avatar,
      password: null,
      confirmPassword: null,
    });

    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(user.avatar ? user.avatar + "/public" : "");
    setFile(null);
    setUploadUrl("");
    setCurrentPhoto(user.avatar);
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

      const result = await action(fd);

      if (!result.success) {
        // 전역 에러(formErrors)는 Toast로, 필드 에러(fieldErrors)는 Input 하단에 표시
        if (result.errors) {
          const formMsg = result.errors.formErrors?.[0];
          if (formMsg) toast.error(formMsg);

          Object.entries(result.errors.fieldErrors ?? {}).forEach(
            ([k, arr]) => {
              const msg = Array.isArray(arr) ? arr[0] : undefined;
              if (msg)
                setError(k as keyof ProfileEditDTO, {
                  type: "server",
                  message: msg,
                });
            }
          );
        }
        return;
      }

      toast.success("프로필 수정 완료!");
      router.replace("/profile");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(onValid);
  const showSetupNotice = user.needsEmailSetup || user.needsPasswordSetup;
  const phoneReg = register("phone");

  return (
    <div className="layout-container pt-page-y pb-24 px-page-x bg-background">
      <h1 className="text-2xl font-bold text-center mb-8 text-primary">
        프로필 수정
      </h1>

      {/* 아바타 업로드 영역 */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer">
          <label
            htmlFor="photo"
            className={cn(
              "flex flex-col items-center justify-center size-28 rounded-full overflow-hidden border-2 border-border bg-surface-dim",
              "hover:border-brand/50 transition-colors",
              !preview && "text-muted"
            )}
          >
            {preview ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${preview})` }}
              />
            ) : (
              <PhotoIcon className="size-8" />
            )}
            {/* Overlay Icon */}
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
            className="mt-3 text-xs text-muted hover:text-danger underline transition-colors"
          >
            아바타 삭제
          </button>
        )}
      </div>

      {/* 폼 영역 */}
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        {/* Username */}
        <Input
          id="username"
          label="선원 닉네임"
          type="text"
          required
          placeholder="닉네임 (3~10자)"
          {...register("username")}
          errors={[errors.username?.message ?? ""]}
          minLength={3}
          maxLength={10}
          aria-invalid={!!errors.username}
          icon={<UserIcon className="size-5" />}
        />

        {showSetupNotice && (
          <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm">
            ⚠️ 원활한 서비스 이용을 위해 이메일과 비밀 항해 코드를 설정해주세요.
          </div>
        )}

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-primary">이메일</label>
          {user.needsEmailSetup ? (
            <Input
              id="email"
              type="email"
              placeholder="이메일 주소"
              {...register("email")}
              errors={[errors.email?.message ?? ""]}
              icon={<EnvelopeIcon className="size-5" />}
            />
          ) : (
            <div className="input-primary h-input-md px-4 flex items-center bg-surface-dim text-muted cursor-not-allowed border border-border">
              <EnvelopeIcon className="size-5 mr-2" />
              {user.email ?? "미설정"}
              <span className="ml-auto text-xs">(변경 불가)</span>
            </div>
          )}
        </div>

        {/* Password Setup */}
        {user.needsPasswordSetup && (
          <div className="space-y-4 pt-2 border-t border-border mt-2">
            <Input
              label="비밀 항해 코드 설정"
              type="password"
              passwordToggle
              placeholder="비밀번호"
              {...register("password")}
              errors={[errors.password?.message ?? ""]}
              icon={<LockClosedIcon className="size-5" />}
            />
            <Input
              type="password"
              passwordToggle
              placeholder="비밀번호 확인"
              {...register("confirmPassword")}
              errors={[errors.confirmPassword?.message ?? ""]}
              icon={<KeyIcon className="size-5" />}
            />
          </div>
        )}

        {/* Phone Verification */}
        <div className="space-y-3 pt-4 border-t border-border">
          <label className="text-sm font-medium text-primary">
            전화번호 (선택)
          </label>

          <div className="p-4 rounded-xl border border-border bg-surface shadow-sm space-y-4">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="01012345678"
                  className="bg-transparent"
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
                    className="h-input-md px-4 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
                  >
                    인증 요청
                  </button>
                )}
            </div>

            {phoneVerificationSent && !phoneVerified && (
              <div className="flex gap-2 animate-fade-in">
                <Input
                  placeholder="인증번호 6자리 입력"
                  value={phoneToken}
                  onChange={(e) => setPhoneToken(e.target.value)}
                  errors={[phoneVerificationError]}
                  inputMode="numeric"
                  maxLength={6}
                  className="text-center tracking-widest"
                />
                <button
                  type="button"
                  onClick={handleVerifyToken}
                  disabled={submitting}
                  className="h-input-md px-4 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-sm whitespace-nowrap"
                >
                  확인
                </button>
              </div>
            )}

            {phoneVerified && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                <span>✓ 인증되었습니다.</span>
              </div>
            )}

            <div className="text-xs text-muted leading-relaxed">
              * 전화번호 변경은 인증 완료 시 즉시 저장됩니다.
              <br />* 이미 인증된 번호는 삭제할 수 없습니다.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-4">
          <Button
            text={submitting ? "저장 중..." : "수정 완료"}
            disabled={submitting}
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="btn-secondary h-12 text-sm border-transparent bg-surface hover:bg-surface-dim text-muted"
            >
              초기화
            </button>
            <Link
              href="/profile"
              className="flex items-center justify-center btn-secondary h-12 text-sm border-transparent bg-surface hover:bg-surface-dim text-muted"
            >
              취소
            </Link>
          </div>
        </div>
      </form>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={avatarConfirmOpen}
        title="아바타 삭제"
        description="프로필 사진을 기본 이미지로 변경하시겠습니까?"
        confirmLabel="삭제"
        onConfirm={confirmClearAvatar}
        onCancel={() => setAvatarConfirmOpen(false)}
        loading={submitting}
      />
    </div>
  );
}
