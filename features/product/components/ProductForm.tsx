/**
 * File Name : features/product/components/ProductForm.tsx
 * Description : 제품 등록,편집 폼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.12  임도헌   Created
 * 2025.06.12  임도헌   Modified  제품 등록 폼 컴포넌트로 분리
 * 2025.06.15  임도헌   Modified  제품 편집 컴포넌트를 병합해서 등록, 편집 통합 폼으로 리팩토링
 * 2025.06.18  임도헌   Modified  제품 등록 시 id를 zod에서 optional로 지정해서 오류 해결
 * 2025.09.10  임도헌   Modified  getUploadUrl 유니온 분기 처리로 TS 에러 해결 + File 타입 가드
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 폼 간격(gap-form-gap) 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.26  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.02.14  임도헌   Modified  직거래 희망 장소(지도) 추가
 * 2026.02.25  임도헌   Modified  Cloudflare Images hash 하드코딩 제거
 * 2026.02.26  임도헌   Modified  둥근 맵 핀 아이콘의 배경과 색상 개선
 * 2026.02.28  임도헌   Modified  formData 생성 로직 표준화 및 가독성 개선
 * 2026.03.01  임도헌   Modified  tanstack query 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.05  임도헌   Modified  flow=modal-edit 분기 추가, 편집 완료 시 모달/페이지 복귀 동작 분리
 * 2026.03.07  임도헌   Modified  성공/실패 피드백 문구를 구체화해 v1.2 기준 반영
 * 2026.03.08  임도헌   Modified  커스텀 검증 UX(noValidate, fieldErrors, 첫 에러 이동, 이미지/카테고리 에러 표시) 정리
 * 2026.03.09  임도헌   Modified  기타 카테고리 예외를 seed의 eng_name(OTHER) 기준으로 안정화
 * 2026.03.12  임도헌   Modified  등록 성공 시 replace 이동, 이미지 섹션 포커스, 카테고리 에러 분기 로직 추가
 * 2026.03.12  임도헌   Modified  사용자 업로드 이미지의 애니메이션 메타를 저장하고 GIF만 조건부 최적화 예외 처리
 * 2026.03.13  임도헌   Modified  일반 편집 완료 후에도 returnTo를 유지한 상세 경로로 복귀하도록 보강
 * 2026.03.14  임도헌   Modified  모달 편집 저장 완료 시 공통 세션 refresh 플래그를 기록한 뒤 목록 릴레이를 통해 모달 상세를 다시 열도록 조정
 * 2026.03.14  임도헌   Modified  가격/카테고리/게임 종류 우선 흐름으로 필드 순서를 재배치하고 수정 모드 리셋을 원래 값 복원 방식으로 정리
 * 2026.03.14  임도헌   Modified  게임 종류 placeholder, 이미지 최대 수 안내, 버튼 레이블을 보강해 모바일/데스크톱 작성 흐름을 명확화
 * 2026.03.19  임도헌   Modified  상품 폼의 섹션 리듬과 CTA 위계를 정리하고 직거래 장소 카드 액션을 inline 흐름으로 다듬음
 * 2026.03.28  임도헌   Modified  추가/수정 폼 카테고리 Select는 이모지 없이 텍스트 라벨만 노출하도록 정리
 * 2026.04.02  임도헌   Modified  제품 이미지 URL public variant 처리 유틸 공용화
 */

/**
 * Legacy History : components/product/ProductEditForm
 *
 * Date        Author   Status    Description
 * 2024.11.02  임도헌   Created
 * 2024.11.02  임도헌   Modified  편집 폼 컴포넌트 추가
 * 2024.11.12  임도헌   Modified  제품 수정 클라우드 플레어로 리팩토링
 * 2024.12.12  임도헌   Modified  useImageUpload 커스텀 훅으로 분리
 * 2024.12.12  임도헌   Modified  제품 편집 폼 액션 코드 추가(여러 이미지 업로드)
 * 2024.12.12  임도헌   Modified  폼 제출 후 모달에서 수정했는지 상세 페이지에서 수정했는지 확인 후 페이지 이동 로직 수정
 * 2024.12.29  임도헌   Modified  보트포트 형식에 맞게 제품 수정 폼 변경
 * 2025.04.13  임도헌   Modified  completeness 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  condition 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  game_type 필드를 영어로 변경
 * 2025.06.15  임도헌   Modified  통합된 제품 폼으로 병합
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useImageUpload } from "@/hooks/useImageUpload";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import {
  COMPLETENESS_TYPES,
  CONDITION_TYPES,
  GAME_TYPES,
  COMPLETENESS_DISPLAY,
  CONDITION_DISPLAY,
  GAME_TYPE_DISPLAY,
  PRODUCT_OTHER_CATEGORY_ENG_NAME,
} from "@/features/product/constants";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { toast } from "sonner";
import ImageUploader from "@/components/global/ImageUploader";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import TagInput from "@/components/ui/TagInput";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import LocationPicker from "@/features/map/components/LocationPicker";
import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  productFormSchema,
  productFormValues,
} from "@/features/product/schemas";
import { queryKeys } from "@/lib/queryKeys";
import type { Category } from "@/generated/prisma/client";
import type { ProductFormAction } from "@/features/product/types";
import type { LocationData } from "@/features/map/types";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import {
  createNavigationRefreshFlagKey,
  setNavigationRefreshFlag,
} from "@/lib/navigationRefreshFlag";
import {
  stripProductImagePublicVariant,
  toProductImagePublicUrl,
} from "@/features/product/utils/image";

interface ProductFormProps {
  mode: "create" | "edit";
  action: ProductFormAction; // Server Action
  defaultValues?: Partial<productFormValues>;
  categories: Category[];
  submitText?: string;
  cancelHref?: string;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * 제품 등록 및 수정 공통 폼 컴포넌트
 *
 * [상태 제어 및 상호작용 로직]
 * - `useForm` 기반 폼 상태 관리 및 Zod 스키마(`productFormSchema`) 연동 유효성 검증 적용
 * - `useImageUpload` 훅을 통한 파일 선택, 드래그 앤 드롭, 순서 변경, 미리보기 생성 관리
 * - 카테고리(대분류/소분류) 연동 및 Kakao Map 기반 위치(`location`) 입력 데이터 매핑
 * - OTHER 대분류 선택 시 소분류 없이 대분류 자체를 `categoryId`로 사용
 * - Cloudflare Images URL 확보 및 이미지 파일 업로드 병렬 처리
 * - 등록/수정 Server Action 완료 시 `queryClient.invalidateQueries` 호출로 목록 캐시 무효화 유도
 * - 검증 실패 시 `FormErrorSummary`, `applyFieldErrors`, `focusFirstFieldError` 기반 커스텀 에러 UX 적용
 */
export default function ProductForm({
  mode,
  action,
  defaultValues = {},
  categories,
  cancelHref = "/products",
}: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sp = useSearchParams();
  // 폼 저장 후 상세 복귀에 사용하는 returnTo 정제
  const rawReturnTo = sp.get("returnTo");
  const returnTo = rawReturnTo
    ? sanitizeCallbackUrl(rawReturnTo)
    : null;
  const isModalEditFlow = sp.get("flow") === "modal-edit";
  const [resetSignal, setResetSignal] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const maxImages = 5;

  const initialFormValues = useMemo(
    () => ({
      id: defaultValues.id || 0,
      title: defaultValues.title || "",
      description: defaultValues.description || "",
      price: defaultValues.price,
      photos: defaultValues.photos || [],
      photosAnimated:
        defaultValues.photosAnimated || defaultValues.photos?.map(() => false),
      game_type: defaultValues.game_type ?? undefined,
      min_players: defaultValues.min_players,
      max_players: defaultValues.max_players,
      play_time: defaultValues.play_time,
      condition: defaultValues.condition || "NEW",
      completeness: defaultValues.completeness || "PERFECT",
      has_manual: defaultValues.has_manual ?? true,
      categoryId: defaultValues.categoryId ?? undefined,
      tags: defaultValues.tags || [],
      location: defaultValues.location ?? null,
    }),
    [defaultValues]
  );

  // 대분류 초기값 설정 (수정 모드 시 소분류 ID로부터 역추적)
  const initialMainCategory = useMemo<number | null>(() => {
    if (!defaultValues?.categoryId) return null;
    const currentCategory =
      categories.find((c) => c.id === defaultValues.categoryId) ?? null;
    if (!currentCategory) return null;
    return currentCategory.parentId ?? currentCategory.id;
  }, [categories, defaultValues?.categoryId]);

  const [selectedMainCategory, setSelectedMainCategory] = useState<
    number | null
  >(initialMainCategory);

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );
  const selectedMainCategoryData = useMemo(
    () => categories.find((c) => c.id === selectedMainCategory) ?? null,
    [categories, selectedMainCategory]
  );
  const subCategories = useMemo(
    () => categories.filter((c) => c.parentId === selectedMainCategory),
    [categories, selectedMainCategory]
  );
  const isOtherMainCategory =
    selectedMainCategoryData?.eng_name === PRODUCT_OTHER_CATEGORY_ENG_NAME;
  const subDisabled = !selectedMainCategory || isOtherMainCategory;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
    getValues,
    resetField,
    setError,
    setFocus,
    clearErrors,
  } = useForm<productFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialFormValues,
  });
  const selectedCategoryId = watch("categoryId");

  const categoryErrorMessage = errors.categoryId?.message;
  const mainCategoryErrors =
    categoryErrorMessage && !selectedMainCategory ? [categoryErrorMessage] : [];
  const subCategoryErrors =
    categoryErrorMessage && selectedMainCategory && !isOtherMainCategory
      ? [categoryErrorMessage]
      : [];

  const {
    previews,
    files,
    isImageFormOpen,
    setIsImageFormOpen,
    handleImageChange,
    handleImageDrop,
    handleDeleteImage,
    handleDragEnd,
    animatedFlags,
    setAnimatedFlags,
    setPreviews,
    resetImage,
  } = useImageUpload({
    maxImages,
    setValue,
    getValues,
    syncAnimatedFlags: true,
  });

  // 초기 이미지 설정
  useEffect(() => {
    if (
      Array.isArray(defaultValues.photos) &&
      defaultValues.photos.length > 0
    ) {
      setPreviews(
        defaultValues.photos
          .map((url) => toProductImagePublicUrl(url))
          .filter((url): url is string => !!url)
      );
      setValue("photos", defaultValues.photos);
      const initialAnimatedFlags =
        defaultValues.photosAnimated ?? defaultValues.photos.map(() => false);
      setValue("photosAnimated", initialAnimatedFlags);
      setAnimatedFlags(initialAnimatedFlags);
    }
  }, [
    defaultValues.photos,
    defaultValues.photosAnimated,
    setAnimatedFlags,
    setValue,
    setPreviews,
  ]);

  // minPlayers 변경 시 maxPlayers 자동 조정 (UX)
  const minPlayers = watch("min_players");
  const maxPlayers = watch("max_players");

  useEffect(() => {
    if (minPlayers && maxPlayers && minPlayers > maxPlayers) {
      setValue("max_players", minPlayers);
    }
  }, [minPlayers, maxPlayers, setValue]);

  // 카테고리 초기값 동기화
  useEffect(() => {
    if (defaultValues.categoryId && categories.length > 0) {
      const currentCategory = categories.find(
        (cat) => cat.id === defaultValues.categoryId
      );
      if (!currentCategory) return;

      setSelectedMainCategory(currentCategory.parentId ?? currentCategory.id);
      setValue("categoryId", defaultValues.categoryId);
    }
  }, [categories, defaultValues.categoryId, setValue]);

  useEffect(() => {
    if (!selectedMainCategory) return;

    if (isOtherMainCategory) {
      setValue("categoryId", selectedMainCategory, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("categoryId");
      return;
    }

    if (!subCategories.some((category) => category.id === selectedCategoryId)) {
      resetField("categoryId");
    }
  }, [
    clearErrors,
    isOtherMainCategory,
    resetField,
    selectedCategoryId,
    selectedMainCategory,
    setValue,
    subCategories,
  ]);

  // 위치 관련 상태
  const [isMapOpen, setIsMapOpen] = useState(false);
  const location = watch("location");
  const imageSectionRef = useRef<HTMLDivElement | null>(null);

  const focusImageSection = () => {
    setIsImageFormOpen(true);
    imageSectionRef.current?.focus();
    imageSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  };

  // 위치 선택 핸들러
  const handleLocationSelect = (data: LocationData) => {
    setValue("location", data, { shouldDirty: true });
    setIsMapOpen(false);
  };

  const handleRemoveLocation = () => {
    setValue("location", null, { shouldDirty: true });
  };

  const onValid = async (data: productFormValues) => {
    if (mode === "create" && files.length === 0) {
      setError("photos", {
        type: "manual",
        message: "최소 1개 이상의 이미지를 업로드해주세요.",
      });
      focusImageSection();
      return;
    }

    setIsUploading(true);
    try {
      const newFiles = files.filter((file) => file instanceof File);
      if (newFiles.length > 0 && !CF_HASH) {
        toast.error("이미지 업로드 설정 오류 (CF_HASH Missing)");
        return;
      }
      const uploadedPhotoUrls: string[] = [];

      // 1. 신규 이미지 업로드
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map(async (file) => {
          const res = await getUploadUrl();
          if (!res.success) {
            throw new Error(res.error || "Failed to get upload URL");
          }

          const { uploadURL, id } = res.result;
          const cloudflareForm = new FormData();
          cloudflareForm.append("file", file);

          const response = await fetch(uploadURL, {
            method: "POST",
            body: cloudflareForm,
          });

          if (!response.ok) throw new Error("Failed to upload image");
          return `https://imagedelivery.net/${CF_HASH}/${id}`;
        });
        const urls = await Promise.all(uploadPromises);
        uploadedPhotoUrls.push(...urls);
      }

      // 2. 최종 이미지 URL 조합
      const allPhotos: string[] = previews
        .map((preview) => {
          if (preview.includes("imagedelivery.net")) {
            return stripProductImagePublicVariant(preview);
          } else if (preview.startsWith("blob:")) {
            const blobUrls = previews.filter((p) => p.startsWith("blob:"));
            const index = blobUrls.indexOf(preview);
            return uploadedPhotoUrls[index] ?? "";
          }
          return preview;
        })
        .filter((url): url is string => !!url);
      const allPhotosAnimated = allPhotos.map(
        (_, index) => animatedFlags[index] ?? false
      );

      // 3. 폼 데이터 생성 (표준화)
      const formData = new FormData();

      // [특수 필드 1] ID (수정 모드)
      if (mode === "edit" && defaultValues.id) {
        formData.append("id", defaultValues.id.toString());
      }

      // [특수 필드 2] JSON 직렬화
      if (data.location) {
        formData.append("location", JSON.stringify(data.location));
      }
      formData.append("tags", JSON.stringify(data.tags || []));

      // [특수 필드 3] 이미지 배열
      allPhotos.forEach((url) => formData.append("photos[]", url));
      formData.append("photosAnimated", JSON.stringify(allPhotosAnimated));

      // [일반 필드] 자동 매핑
      const skipFields = ["id", "location", "tags", "photos", "photosAnimated"];
      Object.entries(data).forEach(([key, value]) => {
        if (
          !skipFields.includes(key) &&
          value !== undefined &&
          value !== null
        ) {
          formData.append(key, value.toString());
        }
      });

      const result = await action(formData);

      if (result.success) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.products.all,
        });
        const { productId } = result;

        const detailHref = `/products/view/${productId}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

        if (mode === "create") {
          toast.success(
            "제품이 등록되었습니다. 상세 페이지에서 바로 거래를 이어갈 수 있습니다."
          );
          router.replace(detailHref);
        } else if (mode === "edit") {
          toast.success(
            "제품 정보가 수정되었습니다. 변경 내용이 상세 페이지에 반영됩니다."
          );
          if (isModalEditFlow && returnTo) {
            // 모달 편집은 히스토리에 의존하지 않고 목록 릴레이를 거쳐
            // 상세 모달을 다시 열어 저장/삭제 후 복귀를 더 안정화
            setNavigationRefreshFlag(
              createNavigationRefreshFlagKey("product-modal-refresh", productId)
            );
            router.replace(
              `/products?openProductId=${productId}&returnTo=${encodeURIComponent(returnTo)}`
            );
          } else {
            // 일반 상세에서 편집한 경우: edit 히스토리 제거
            window.location.replace(detailHref);
          }
        }
      } else {
        if (result.fieldErrors) {
          applyFieldErrors<productFormValues>(setError, result.fieldErrors, {
            setFocus,
          });
        }

        if (result.error) {
          toast.error(
            result.error ??
              (mode === "create"
                ? "제품 등록에 실패했습니다. 필수 입력값과 이미지 업로드 상태를 확인한 뒤 다시 시도해주세요."
                : "제품 수정에 실패했습니다. 변경한 항목을 확인한 뒤 다시 시도해주세요.")
          );
        }
      }
    } catch (err) {
      console.error("upload error:", err);
      toast.error(
        mode === "create"
          ? "제품 등록 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
          : "제품 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const onInvalid = (formErrors: typeof errors) => {
    if (formErrors.photos) {
      focusImageSection();
      return;
    }
    focusFirstFieldError<productFormValues>(formErrors, setFocus);
  };

  useEffect(() => {
    if (previews.length > 0) {
      clearErrors("photos");
    }
  }, [previews.length, clearErrors]);

  const resetForm = () => {
    resetImage();
    reset(initialFormValues);
    setResetSignal((s) => s + 1);

    const restoredAnimatedFlags =
      initialFormValues.photosAnimated ?? initialFormValues.photos.map(() => false);
    const restoredPreviews = initialFormValues.photos
      .map((url) => toProductImagePublicUrl(url))
      .filter((url): url is string => !!url);

    setSelectedMainCategory(initialMainCategory);
    setPreviews(restoredPreviews);
    setAnimatedFlags(restoredAnimatedFlags);
    setValue("photos", initialFormValues.photos);
    setValue("photosAnimated", restoredAnimatedFlags);
  };

  const handleMainCategoryChange = (value: string) => {
    const id = value ? Number(value) : null;
    setSelectedMainCategory(id);
    if (!id) {
      resetField("categoryId");
      return;
    }

    const selectedCategory = categories.find((category) => category.id === id);
    if (selectedCategory?.eng_name === PRODUCT_OTHER_CATEGORY_ENG_NAME) {
      setValue("categoryId", id, {
        shouldDirty: true,
        shouldValidate: true,
      });
      clearErrors("categoryId");
      return;
    }

    resetField("categoryId");
  };

  return (
    <form
      onSubmit={handleSubmit(onValid, onInvalid)}
      className="flex flex-col gap-form-gap px-page-x py-page-y"
      noValidate
    >
      <FormErrorSummary errors={errors} />

      {/* 이미지 업로더 */}
      <div ref={imageSectionRef} tabIndex={-1} className="flex flex-col gap-2">
        <label className="text-sm font-medium text-primary">상품 이미지</label>
        <ImageUploader
          previews={previews}
          onImageChange={handleImageChange}
          onImageDrop={handleImageDrop}
          onDeleteImage={handleDeleteImage}
          onDragEnd={handleDragEnd}
          isOpen={isImageFormOpen}
          onToggle={() => setIsImageFormOpen(!isImageFormOpen)}
          isUploading={isUploading}
          optional={false}
        />
        <p className="pl-1 text-[11px] text-muted/80">
          최대 {maxImages}장까지 업로드할 수 있으며, 첫 번째 이미지가 대표
          이미지로 표시됩니다.
        </p>
        {errors.photos?.message ? (
          <p className="text-xs text-danger pl-1">{errors.photos.message}</p>
        ) : previews.length === 0 && mode === "create" ? (
          <p className="text-xs text-danger pl-1">
            * 최소 1개 이상의 이미지를 업로드해주세요.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-sm font-semibold text-primary">기본 정보</h2>
        <p className="text-xs text-muted">
          상품을 빠르게 이해할 수 있도록 핵심 정보를 먼저 입력해주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-form-gap">
        <div className="md:col-span-2 md:order-1">
          <Input
            label="제품명"
            type="text"
            required
            placeholder="제품명을 입력해주세요"
            {...register("title")}
            errors={[errors.title?.message ?? ""]}
          />
        </div>
        <div className="md:order-2">
          <Input
            label="가격"
            type="number"
            required
            placeholder="가격을 입력해주세요"
            {...register("price")}
            errors={[errors.price?.message ?? ""]}
          />
          <p className="pl-1 pt-1 text-[11px] text-muted">
            숫자만 입력하면 원 단위로 저장됩니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-form-gap">
        <Select
          label="대분류"
          value={selectedMainCategory?.toString() || ""}
          onChange={(e) => handleMainCategoryChange(e.target.value)}
          errors={mainCategoryErrors}
        >
          <option value="">대분류 선택</option>
          {mainCategories.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.kor_name}
            </option>
          ))}
        </Select>

        <div
          className={
            subDisabled ? "opacity-60 pointer-events-none select-none" : ""
          }
          aria-disabled={subDisabled}
        >
          <Select
            label="소분류"
            {...register("categoryId", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
            disabled={subDisabled}
            errors={subCategoryErrors}
          >
            <option value="">
              {isOtherMainCategory
                ? "기타는 소분류 선택이 필요하지 않습니다"
                : "소분류 선택"}
            </option>
            {subCategories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.kor_name}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="게임 종류"
          {...register("game_type", {
            setValueAs: (value) => (value === "" ? undefined : value),
          })}
          errors={[errors.game_type?.message ?? ""]}
        >
          <option value="">게임 종류 선택</option>
          {GAME_TYPES.map((type) => (
            <option key={type} value={type}>
              {GAME_TYPE_DISPLAY[type]}
            </option>
          ))}
        </Select>
      </div>

      <Input
        label="상세 설명"
        type="textarea"
        required
        placeholder="제품의 상태, 특이사항 등을 자세히 적어주세요."
        {...register("description")}
        errors={[errors.description?.message ?? ""]}
      />

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-sm font-semibold text-primary">게임 정보</h2>
        <p className="text-xs text-muted">
          플레이 조건과 제품 상태를 함께 정리해 구매 판단을 돕습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-form-gap">
        <Input
          label="최소 인원"
          type="number"
          required
          placeholder="2"
          {...register("min_players")}
          errors={[errors.min_players?.message ?? ""]}
        />
        <Input
          label="최대 인원"
          type="number"
          required
          placeholder="4"
          {...register("max_players")}
          errors={[errors.max_players?.message ?? ""]}
        />
        <Input
          label="플레이 시간"
          type="text"
          required
          placeholder="예: 30-60분"
          {...register("play_time")}
          errors={[errors.play_time?.message ?? ""]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-form-gap">
        <Select
          label="제품 상태"
          {...register("condition")}
          errors={[errors.condition?.message ?? ""]}
        >
          {CONDITION_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONDITION_DISPLAY[type]}
            </option>
          ))}
        </Select>

        <Select
          label="구성품 상태"
          {...register("completeness")}
          errors={[errors.completeness?.message ?? ""]}
        >
          {COMPLETENESS_TYPES.map((type) => (
            <option key={type} value={type}>
              {COMPLETENESS_DISPLAY[type]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-dim/40 px-4 py-3">
        <input
          id="has_manual"
          type="checkbox"
          {...register("has_manual")}
          className="h-5 w-5 shrink-0 rounded border-border text-brand focus:ring-brand"
        />
        <label
          htmlFor="has_manual"
          className="text-sm font-medium text-primary cursor-pointer"
        >
          설명서 포함 여부
        </label>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-sm font-semibold text-primary">거래 정보</h2>
        <p className="text-xs text-muted">
          검색과 직거래에 필요한 마무리 정보를 입력해주세요.
        </p>
      </div>

      <TagInput
        name="tags"
        control={control}
        maxTags={5}
        resetSignal={resetSignal}
      />

      {/* 직거래 장소 선택 섹션 */}
      <div className="flex flex-col gap-2 pt-2">
        <label className="text-sm font-medium text-primary flex items-center gap-1">
          <MapPinIcon className="size-4" />
          직거래 희망 장소{" "}
          <span className="text-muted font-normal">(선택)</span>
        </label>

        {location ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-surface p-3 shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="p-2 bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light rounded-full">
                <MapPinIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-primary">
                  {location.locationName}
                </p>
                <p className="truncate text-xs text-muted">
                  {location.region1} {location.region2} {location.region3}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className="px-2 py-1 text-xs font-medium text-muted hover:text-primary"
              >
                변경
              </button>
              <button
                type="button"
                onClick={handleRemoveLocation}
                className="text-muted hover:text-danger p-1"
                title="위치 삭제"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-dim/30 text-muted hover:text-primary hover:bg-surface-dim hover:border-brand/30 transition-all"
          >
            <MapPinIcon className="size-5" />
            <span className="text-sm">거래 장소 추가하기</span>
          </button>
        )}
      </div>

      <div className="pt-4 flex flex-col gap-3">
        <Button
          text={
            isUploading
              ? mode === "edit"
                ? "수정 중..."
                : "업로드 중..."
              : mode === "edit"
                ? "수정하기"
                : "등록하기"
          }
          disabled={isUploading}
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="h-12 rounded-xl font-medium text-sm border border-border bg-surface text-muted hover:bg-surface-dim transition-colors"
          >
            {mode === "edit" ? "원래 값으로 되돌리기" : "전체 초기화"}
          </button>
          <Link
            href={cancelHref}
            className="flex items-center justify-center h-12 rounded-xl font-medium text-sm border border-border bg-surface text-muted hover:bg-surface-dim transition-colors"
          >
            취소
          </Link>
        </div>
      </div>

      {/* 지도 모달 */}
      {isMapOpen && (
        <LocationPicker
          onClose={() => setIsMapOpen(false)}
          onSelect={handleLocationSelect}
          initialData={location ?? undefined}
        />
      )}
    </form>
  );
}
