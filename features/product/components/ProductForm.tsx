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
 * 2026.04.05  임도헌   Modified  modal-edit 저장/취소는 back 복귀를 우선 사용해 목록/모달 히스토리 중복을 줄이고, 직접 진입만 릴레이 fallback으로 처리
 * 2026.04.06  임도헌   Modified  detail-edit 저장도 back 우선 + 1회 refresh로 정리해 상세/편집 히스토리 중복을 완화
 * 2026.04.10  임도헌   Modified  가격 입력 칸의 폭과 도움말 리듬을 조정해 기본 정보 섹션 위계 가독성 개선
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 상품 폼의 섹션 헤더와 도움말 타이포를 정리
 * 2026.04.14  임도헌   Modified  거래 장소 선택 모달을 지연 로드해 등록 페이지 초기 번들 부담을 완화
 * 2026.04.14  임도헌   Modified  지연 로드/복귀 흐름/업로드 단계 주석을 현재 구조 기준으로 간결하게 정리
 * 2026.04.14  임도헌   Modified  use client 직렬화 경고를 피하기 위해 서버 액션 prop을 제거하고 mode 기반 내부 선택으로 전환
 * 2026.04.21  임도헌   Modified  이미지/카테고리/거래 장소/하단 액션 섹션을 분리하고 함수 설명을 보강
 * 2026.04.24  임도헌   Modified  edit 저장 back 복귀는 명시적 내부 returnTo 문맥과 히스토리가 모두 있을 때만 허용하도록 보강
 * 2026.04.24  임도헌   Modified  detail-edit 취소도 안전한 내부 returnTo 문맥이면 back 복귀를 우선 사용하도록 정리
 * 2026.04.24  임도헌   Modified  navigation refresh helper 기준으로 detail/modal edit 복귀 플래그 기록 중복을 정리
 * 2026.05.03  임도헌   Modified  보드게임 카탈로그 연결 선택 필드 추가
 * 2026.05.03  임도헌   Modified  선택한 보드게임 메타데이터로 게임 정보 필드를 채우는 보조 액션 추가
 * 2026.05.03  임도헌   Modified  상품명/태그 보조 흐름을 고려해 보드게임 연결 필드를 기본 정보 상단으로 이동
 * 2026.05.03  임도헌   Modified  선택한 보드게임 기준 제품명 채우기와 검색 태그 추가 액션 보강
 * 2026.05.03  임도헌   Modified  보드게임 기반 제품명/태그/게임 정보 보조 액션 주석 보강
 * 2026.05.05  임도헌   Modified  상품 폼 복귀/위치/검증 핸들러 JSDoc 보강
 * 2026.05.16  임도헌   Modified  제품 폼 값 타입명을 PascalCase 기준으로 정리
 * 2026.05.30  임도헌   Modified  모바일 상품 폼의 필드 높이와 섹션 간격을 압축해 작성 밀도 조정
 * 2026.06.18  임도헌   Modified  거래 기준 지역 필수화에 맞춰 위치 검증/에러 이동 UX 보강
 * 2026.08.22  임도헌   Modified  상품 전용 업로드 용도와 서버가 반환한 MediaAsset delivery URL 사용
 * 2026.08.24  임도헌   Modified  사용자 노출 거래 명칭을 상품으로 통일
 * 2026.08.24  임도헌   Modified  Next.js 16 모달 편집 복귀를 목록 relay로 고정하고 목적 경로 전환 후 성공 피드백 표시
 * 2026.08.27  임도헌   Modified  모션 축소 설정에 따라 폼 오류·이미지 섹션 스크롤 동작 조정
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
 * 2024.12.29  임도헌   Modified  보드포트 형식에 맞게 제품 수정 폼 변경
 * 2025.04.13  임도헌   Modified  completeness 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  condition 필드를 영어로 변경
 * 2025.04.13  임도헌   Modified  game_type 필드를 영어로 변경
 * 2025.06.15  임도헌   Modified  통합된 제품 폼으로 병합
 */

"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useImageUpload } from "@/hooks/useImageUpload";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { createProductAction } from "@/features/product/actions/create";
import { updateProductAction } from "@/features/product/actions/update";
import {
  COMPLETENESS_TYPES,
  CONDITION_TYPES,
  COMPLETENESS_DISPLAY,
  CONDITION_DISPLAY,
  PRODUCT_OTHER_CATEGORY_ENG_NAME,
  PRODUCT_UPDATE_SUCCESS_MESSAGE,
} from "@/features/product/constants";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { getMotionSafeScrollBehavior } from "@/lib/accessibility";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TagInput from "@/components/ui/TagInput";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import { productFormSchema } from "@/features/product/schemas";
import { queryKeys } from "@/lib/queryKeys";
import type { Category } from "@/generated/prisma/client";
import type { LocationData } from "@/features/map/types";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import {
  canUseBrowserBack,
  markNavigationRefresh,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";
import { markNavigationSuccessToast } from "@/lib/navigationToast";
import {
  stripProductImagePublicVariant,
  toProductImagePublicUrl,
} from "@/features/product/utils/image";
import ProductImageSection from "@/features/product/components/ProductImageSection";
import ProductCategorySection from "@/features/product/components/ProductCategorySection";
import ProductLocationSection from "@/features/product/components/ProductLocationSection";
import ProductFormActions from "@/features/product/components/ProductFormActions";
import BoardGameRelationField from "@/features/boardgame/components/BoardGameRelationField";
import type { ProductFormValues } from "@/features/product/schemas";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

const LazyLocationPicker = dynamic(
  () => import("@/features/map/components/LocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
        <div className="bg-surface w-full h-[100dvh] sm:h-auto sm:max-w-md sm:rounded-3xl flex flex-col items-center justify-center gap-4 border-0 sm:border sm:border-border-subtle p-8">
          <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-primary">
            지도를 불러오는 중입니다...
          </p>
        </div>
      </div>
    ),
  }
);

interface ProductFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<ProductFormValues>;
  categories: Category[];
  boardGameOptions?: BoardGameRelationOption[];
  submitText?: string;
  cancelHref?: string;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * 제품 등록 및 수정 공통 폼 컴포넌트
 *
 * - RHF + Zod 기반 검증과 필드 상태를 관리
 * - 이미지 업로드/정렬/애니메이션 메타를 통합 관리
 * - 대분류/소분류, 거래 장소, 태그 등 부가 입력 흐름을 함께 조정
 * - 저장 성공 후 create/edit 진입 맥락에 맞춰 back·목록 relay·replace 복귀 경로를 분기
 * - 지도 선택 모달은 첫 화면 번들을 줄이기 위해 필요 시점에만 지연 로드
 */
export default function ProductForm({
  mode,
  defaultValues = {},
  categories,
  boardGameOptions = [],
  cancelHref = "/products",
}: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sp = useSearchParams();
  // 저장 후 상세/목록 복귀에 재사용할 returnTo를 안전한 내부 경로로 정제
  const rawReturnTo = sp.get("returnTo");
  const returnTo = rawReturnTo ? sanitizeCallbackUrl(rawReturnTo) : null;
  // back 복귀는 앱이 심어 둔 내부 returnTo 문맥과 실제 히스토리가 함께 있을 때만 허용
  const canResumeEditHistory = !!rawReturnTo && canUseBrowserBack();
  const isModalEditFlow = sp.get("flow") === "modal-edit";
  const [resetSignal, setResetSignal] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const maxImages = 5;
  // create/edit 공개 props에는 직렬화 가능한 값만 두고, 서버 액션은 mode로 내부 선택
  const action = mode === "create" ? createProductAction : updateProductAction;

  /**
   * 모달 편집 종료 후 목록 문맥을 복원하고 인터셉트 모달을 다시 연다.
   *
   * @param productId - 저장된 상품 id
   */
  const returnToModalEditOrigin = (productId: number) => {
    const modalReturnTo = returnTo ?? "/products";
    // Next.js 16은 back 시 Parallel Route 대신 canonical 상세를 복원할 수 있으므로
    // 목록 relay가 returnTo를 복원한 뒤 인터셉트 모달을 다시 열도록 항상 위임한다.
    router.replace(
      `/products?openProductId=${productId}&returnTo=${encodeURIComponent(modalReturnTo)}`
    );
  };

  /**
   * 일반 상세 편집 저장 후 상세 페이지로 복귀
   *
   * 명시적 returnTo 문맥의 back 사용과 직접 진입 시 전체 문서 이동으로 stale tree 회피
   *
   * @param productId - 저장된 상품 id
   * @param detailHref - fallback 상세 URL
   */
  const returnToDetailEditOrigin = (productId: number, detailHref: string) => {
    if (canResumeEditHistory) {
      markNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.PRODUCT_DETAIL,
        productId
      );
      router.back();
      return;
    }

    window.location.replace(detailHref);
  };

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
      boardGameIds: defaultValues.boardGameIds || [],
      tags: defaultValues.tags || [],
      location: defaultValues.location ?? null,
    }),
    [defaultValues]
  );

  // 수정 모드에서는 현재 categoryId로부터 대분류를 역추적해 초기 선택값을 복원
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
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialFormValues,
  });
  const selectedCategoryId = watch("categoryId");
  const watchedBoardGameIds = watch("boardGameIds");
  const selectedBoardGameIds = useMemo(
    () => watchedBoardGameIds ?? [],
    [watchedBoardGameIds]
  );
  const selectedBoardGameForAutofill = useMemo(
    () =>
      boardGameOptions.find(
        (option) => option.id === selectedBoardGameIds[0]
      ) ?? null,
    [boardGameOptions, selectedBoardGameIds]
  );

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

  // 수정 모드의 기존 이미지를 미리보기/애니메이션 메타 상태로 동기화
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

  // 최소 인원이 최대 인원을 넘지 않도록 자동 보정
  const minPlayers = watch("min_players");
  const maxPlayers = watch("max_players");

  useEffect(() => {
    if (minPlayers && maxPlayers && minPlayers > maxPlayers) {
      setValue("max_players", minPlayers);
    }
  }, [minPlayers, maxPlayers, setValue]);

  /**
   * 보드게임 카탈로그의 플레이 시간 메타데이터를 상품 폼 입력값 형태로 변환
   *
   * @param option - 선택한 보드게임 옵션
   * @returns `30-60분` 또는 `60분` 형식의 플레이 시간 문자열
   */
  const getBoardGamePlayTimeText = (option: BoardGameRelationOption) => {
    if (option.minPlayTime && option.maxPlayTime) {
      return option.minPlayTime === option.maxPlayTime
        ? `${option.minPlayTime}분`
        : `${option.minPlayTime}-${option.maxPlayTime}분`;
    }

    return option.playingTime ? `${option.playingTime}분` : "";
  };

  /**
   * 선택한 보드게임의 구조화 메타데이터를 상품 게임 정보 입력값으로 복사
   * 제품 상태/구성품 상태는 판매자가 직접 판단해야 하므로 인원과 시간만 자동 입력
   */
  const fillGameInfoFromBoardGame = () => {
    if (!selectedBoardGameForAutofill) return;

    const playTimeText = getBoardGamePlayTimeText(selectedBoardGameForAutofill);

    if (selectedBoardGameForAutofill.minPlayers) {
      setValue("min_players", selectedBoardGameForAutofill.minPlayers, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (selectedBoardGameForAutofill.maxPlayers) {
      setValue("max_players", selectedBoardGameForAutofill.maxPlayers, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (playTimeText) {
      setValue("play_time", playTimeText, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    toast.success("선택한 보드게임의 인원과 플레이 시간을 채웠습니다.");
  };

  /**
   * 선택한 보드게임의 한국어 제목, 원제, 별칭을 상품 검색 태그 후보로 정규화
   *
   * @param option - 선택한 보드게임 옵션
   * @returns 중복을 제거한 태그 후보 목록
   */
  const getBoardGameSuggestedTags = (option: BoardGameRelationOption) => {
    const candidates = [
      option.locale.title,
      option.primaryName,
      ...option.locale.aliases,
    ];
    const seen = new Set<string>();

    return candidates
      .map((tag) => tag.trim())
      .filter((tag) => {
        if (!tag) return false;
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  /**
   * 선택한 보드게임의 검수된 한국어 제목을 제품명에 반영
   */
  const fillTitleFromBoardGame = () => {
    if (!selectedBoardGameForAutofill) return;

    setValue("title", selectedBoardGameForAutofill.locale.title, {
      shouldDirty: true,
      shouldValidate: true,
    });
    toast.success("선택한 보드게임명을 상품명에 반영했습니다.");
  };

  /**
   * 선택한 보드게임의 이름/별칭을 상품 검색 태그에 추가
   * 기존 수동 태그를 지우지 않고, 상품 태그 최대 개수 안에서 빈 자리만 채움
   */
  const addTagsFromBoardGame = () => {
    if (!selectedBoardGameForAutofill) return;

    const currentTags = getValues("tags") ?? [];
    const currentKeys = new Set(currentTags.map((tag) => tag.toLowerCase()));
    const nextTags = [...currentTags];

    for (const tag of getBoardGameSuggestedTags(selectedBoardGameForAutofill)) {
      if (nextTags.length >= 5) break;
      const key = tag.toLowerCase();
      if (currentKeys.has(key)) continue;

      currentKeys.add(key);
      nextTags.push(tag);
    }

    if (nextTags.length === currentTags.length) {
      toast.info("추가할 보드게임 태그가 없거나 태그가 이미 가득 찼습니다.");
      return;
    }

    setValue("tags", nextTags, {
      shouldDirty: true,
      shouldValidate: true,
    });
    toast.success("보드게임명과 별칭을 검색 태그에 추가했습니다.");
  };

  // 수정 모드 첫 진입 시 categoryId 기반 선택 상태를 복원
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

  // 거래 장소 모달 열림 상태와 이미지 섹션 포커스 참조
  const [isMapOpen, setIsMapOpen] = useState(false);
  const location = watch("location");
  const imageSectionRef = useRef<HTMLDivElement | null>(null);
  const locationSectionRef = useRef<HTMLDivElement | null>(null);

  /**
   * 이미지 업로드 섹션 열기와 포커스/스크롤 이동
   */
  const focusImageSection = () => {
    setIsImageFormOpen(true);
    imageSectionRef.current?.focus();
    imageSectionRef.current?.scrollIntoView({
      behavior: getMotionSafeScrollBehavior(),
      block: "center",
      inline: "nearest",
    });
  };

  /**
   * 지도 모달에서 선택한 위치를 상품 거래 위치로 반영
   *
   * @param data - 선택한 위치 데이터
   */
  const handleLocationSelect = (data: LocationData) => {
    setValue("location", data, { shouldDirty: true, shouldValidate: true });
    clearErrors("location");
    setIsMapOpen(false);
  };

  /**
   * 상품 거래 위치 초기화
   */
  const handleRemoveLocation = () => {
    setValue("location", null, { shouldDirty: true, shouldValidate: true });
  };

  /**
   * 폼 유효성 검사를 통과한 뒤 실제 업로드/저장을 수행
   * - blob 미리보기와 기존 Cloudflare URL을 최종 순서대로 재조합한 뒤 서버 액션으로 전달
   */
  const onValid = async (data: ProductFormValues) => {
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

      // 1) 새로 추가한 파일만 Cloudflare에 업로드
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map(async (file) => {
          const res = await getUploadUrl("PRODUCT_IMAGE");
          if (!res.success) {
            throw new Error(res.error || "Failed to get upload URL");
          }

          const { uploadURL, deliveryUrl } = res.result;
          const cloudflareForm = new FormData();
          cloudflareForm.append("file", file);

          const response = await fetch(uploadURL, {
            method: "POST",
            body: cloudflareForm,
          });

          if (!response.ok) throw new Error("Failed to upload image");
          return deliveryUrl;
        });
        const urls = await Promise.all(uploadPromises);
        uploadedPhotoUrls.push(...urls);
      }

      // 2) 기존 이미지와 신규 업로드 이미지를 최종 순서대로 재조합
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

      // 3) 서버 액션으로 넘길 FormData를 표준 규칙으로 구성
      const formData = new FormData();

      // 수정 모드일 때만 id를 포함
      if (mode === "edit" && defaultValues.id) {
        formData.append("id", defaultValues.id.toString());
      }

      // 배열/객체 필드는 JSON으로 직렬화
      if (data.location) {
        formData.append("location", JSON.stringify(data.location));
      }
      formData.append("tags", JSON.stringify(data.tags || []));
      formData.append("boardGameIds", JSON.stringify(data.boardGameIds || []));

      // 이미지 목록과 애니메이션 메타는 별도 필드로 전송
      allPhotos.forEach((url) => formData.append("photos[]", url));
      formData.append("photosAnimated", JSON.stringify(allPhotosAnimated));

      // 나머지 일반 필드는 문자열로 자동 매핑
      const skipFields = [
        "id",
        "location",
        "tags",
        "boardGameIds",
        "photos",
        "photosAnimated",
      ];
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
            "상품이 등록되었습니다. 상세 페이지에서 바로 거래를 이어갈 수 있습니다."
          );
          router.replace(detailHref);
        } else if (mode === "edit") {
          if (isModalEditFlow) {
            // refresh와 성공 피드백을 각각 단발성 신호로 남긴 뒤 모달 상세로 복귀한다.
            markNavigationRefresh(
              NAVIGATION_REFRESH_SCOPES.PRODUCT_MODAL,
              productId
            );
            markNavigationSuccessToast(
              `/products/view/${productId}`,
              PRODUCT_UPDATE_SUCCESS_MESSAGE
            );
            returnToModalEditOrigin(productId);
          } else {
            toast.success(PRODUCT_UPDATE_SUCCESS_MESSAGE);
            // 일반 상세도 동일하게 1회 refresh 플래그를 남기고 복귀
            returnToDetailEditOrigin(productId, detailHref);
          }
        }
      } else {
        if (result.fieldErrors) {
          applyFieldErrors<ProductFormValues>(setError, result.fieldErrors, {
            setFocus,
          });
        }

        if (result.error) {
          toast.error(
            result.error ??
              (mode === "create"
                ? "상품 등록에 실패했습니다. 필수 입력값과 이미지 업로드 상태를 확인한 뒤 다시 시도해주세요."
                : "상품 수정에 실패했습니다. 변경한 항목을 확인한 뒤 다시 시도해주세요.")
          );
        }
      }
    } catch (err) {
      console.error("upload error:", err);
      toast.error(
        mode === "create"
          ? "상품 등록 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
          : "상품 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 유효성 오류 발생 시 이미지 오류 우선 처리와 첫 오류 필드 이동
   *
   * @param formErrors - React Hook Form 오류 객체
   */
  const onInvalid = (formErrors: typeof errors) => {
    if (formErrors.photos) {
      focusImageSection();
      return;
    }

    if (formErrors.location) {
      locationSectionRef.current?.scrollIntoView({
        behavior: getMotionSafeScrollBehavior(),
        block: "center",
        inline: "nearest",
      });
      return;
    }
    focusFirstFieldError<ProductFormValues>(formErrors, setFocus);
  };

  useEffect(() => {
    if (previews.length > 0) {
      clearErrors("photos");
    }
  }, [previews.length, clearErrors]);

  /**
   * 폼 초기 상태 복원
   * - RHF 값뿐 아니라 업로드 미리보기/애니메이션 메타/대분류 선택 상태까지 함께 복원
   */
  const resetForm = () => {
    resetImage();
    reset(initialFormValues);
    setResetSignal((s) => s + 1);

    const restoredAnimatedFlags =
      initialFormValues.photosAnimated ??
      initialFormValues.photos.map(() => false);
    const restoredPreviews = initialFormValues.photos
      .map((url) => toProductImagePublicUrl(url))
      .filter((url): url is string => !!url);

    setSelectedMainCategory(initialMainCategory);
    setPreviews(restoredPreviews);
    setAnimatedFlags(restoredAnimatedFlags);
    setValue("photos", initialFormValues.photos);
    setValue("photosAnimated", restoredAnimatedFlags);
  };

  /**
   * 대분류 선택 변경
   * - 기타(OTHER)는 대분류 자체를 최종 categoryId로 사용하고, 일반 카테고리는 소분류 재선택 유도
   */
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
      className="flex flex-col gap-4 px-5 py-7 sm:gap-form-gap sm:px-page-x sm:py-page-y"
      noValidate
    >
      <FormErrorSummary errors={errors} />

      {/* 이미지 업로드 */}
      <div ref={imageSectionRef} tabIndex={-1} className="flex flex-col gap-2">
        <ProductImageSection
          previews={previews}
          handleImageChange={handleImageChange}
          handleImageDrop={handleImageDrop}
          handleDeleteImage={handleDeleteImage}
          handleDragEnd={handleDragEnd}
          isImageFormOpen={isImageFormOpen}
          setIsImageFormOpen={setIsImageFormOpen}
          isUploading={isUploading}
          maxImages={maxImages}
          mode={mode}
          photoErrorMessage={errors.photos?.message}
        />
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-sm font-medium text-primary">기본 정보</h2>
        <p className="text-xs leading-snug text-muted sm:leading-relaxed">
          상품을 빠르게 이해할 수 있도록 핵심 정보를 먼저 입력해주세요.
        </p>
      </div>

      <BoardGameRelationField
        options={boardGameOptions}
        selectedIds={selectedBoardGameIds}
        onChange={(ids) =>
          setValue("boardGameIds", ids, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        disabled={isUploading}
        errors={
          errors.boardGameIds?.message ? [errors.boardGameIds.message] : []
        }
      />

      {selectedBoardGameForAutofill && (
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-dim/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              {selectedBoardGameForAutofill.locale.title} 기준으로 입력 보조
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              상품명과 검색 태그만 보조로 채우고, 상세 설명과 상품 상태는 직접
              입력합니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={fillTitleFromBoardGame}
              disabled={isUploading}
              className="focus-ring-soft inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-bold text-primary transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              상품명 채우기
            </button>
            <button
              type="button"
              onClick={addTagsFromBoardGame}
              disabled={isUploading}
              className="focus-ring-soft inline-flex h-9 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-bold text-brand-dark transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-light/35 dark:bg-brand-light/10 dark:text-brand-light"
            >
              검색 태그 추가
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-form-gap md:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] md:items-start">
        <div className="md:order-1">
          <Input
            label="상품명"
            type="text"
            required
            placeholder="상품명을 입력해주세요"
            density="compact"
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
            density="compact"
            {...register("price")}
            errors={[errors.price?.message ?? ""]}
          />
          <p className="max-w-64 pl-1 pt-1 text-xs leading-snug text-muted sm:pt-1.5 sm:leading-relaxed">
            숫자만 입력하면 원 단위 가격으로 자동 저장됩니다.
          </p>
        </div>
      </div>

      <ProductCategorySection
        selectedMainCategory={selectedMainCategory}
        onMainCategoryChange={handleMainCategoryChange}
        mainCategories={mainCategories}
        mainCategoryErrors={mainCategoryErrors}
        subDisabled={subDisabled}
        isOtherMainCategory={isOtherMainCategory}
        subCategories={subCategories}
        subCategoryRegister={register("categoryId", {
          setValueAs: (value) => (value === "" ? undefined : Number(value)),
        })}
        subCategoryErrors={subCategoryErrors}
        gameTypeRegister={register("game_type", {
          setValueAs: (value) => (value === "" ? undefined : value),
        })}
        gameTypeErrorMessage={errors.game_type?.message}
      />

      <Input
        label="상세 설명"
        type="textarea"
        required
        placeholder="상품의 상태, 특이사항 등을 자세히 적어주세요."
        density="compact"
        {...register("description")}
        errors={[errors.description?.message ?? ""]}
      />

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-primary">게임 정보</h2>
          <p className="text-xs leading-snug text-muted sm:leading-relaxed">
            플레이 조건과 상품 상태를 함께 정리해 구매 판단을 돕습니다.
          </p>
        </div>
        {selectedBoardGameForAutofill && (
          <button
            type="button"
            onClick={fillGameInfoFromBoardGame}
            disabled={isUploading}
            className="focus-ring-soft inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 px-3 text-xs font-bold text-brand-dark transition-colors hover:border-brand/50 hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-light/35 dark:bg-brand-light/10 dark:text-brand-light"
          >
            도감 정보로 채우기
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-form-gap">
        <Input
          label="최소 인원"
          type="number"
          required
          placeholder="2"
          density="compact"
          {...register("min_players")}
          errors={[errors.min_players?.message ?? ""]}
        />
        <Input
          label="최대 인원"
          type="number"
          required
          placeholder="4"
          density="compact"
          {...register("max_players")}
          errors={[errors.max_players?.message ?? ""]}
        />
        <Input
          label="플레이 시간"
          type="text"
          required
          placeholder="예: 30-60분"
          density="compact"
          {...register("play_time")}
          errors={[errors.play_time?.message ?? ""]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-form-gap">
        <Select
          label="상품 상태"
          density="compact"
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
          density="compact"
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
          className="h-5 w-5 shrink-0 rounded border-border accent-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 dark:accent-brand-light dark:focus-visible:ring-brand-light/40"
        />
        <label
          htmlFor="has_manual"
          className="cursor-pointer text-sm font-medium text-primary"
        >
          설명서 포함 여부
        </label>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-sm font-medium text-primary">거래 정보</h2>
        <p className="text-xs leading-snug text-muted sm:leading-relaxed">
          검색과 직거래에 필요한 마무리 정보를 입력해주세요.
        </p>
      </div>

      <TagInput
        name="tags"
        control={control}
        maxTags={5}
        resetSignal={resetSignal}
      />

      <div ref={locationSectionRef}>
        <ProductLocationSection
          location={location ?? null}
          onOpenMap={() => setIsMapOpen(true)}
          onRemoveLocation={handleRemoveLocation}
          errorMessage={errors.location?.message}
        />
      </div>

      <ProductFormActions
        mode={mode}
        isUploading={isUploading}
        onReset={resetForm}
        onCancel={() => {
          if (mode === "edit" && isModalEditFlow && defaultValues.id) {
            returnToModalEditOrigin(defaultValues.id);
            return;
          }

          if (mode === "edit" && defaultValues.id) {
            returnToDetailEditOrigin(defaultValues.id, cancelHref);
            return;
          }

          router.push(cancelHref);
        }}
      />

      {/* 거래 장소 선택 모달은 필요할 때만 지연 로드 */}
      {isMapOpen && (
        <LazyLocationPicker
          onClose={() => setIsMapOpen(false)}
          onSelect={handleLocationSelect}
          initialData={location ?? undefined}
        />
      )}
    </form>
  );
}
