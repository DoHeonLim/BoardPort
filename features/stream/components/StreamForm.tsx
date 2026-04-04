/**
 * File Name : features/stream/components/StreamForm.tsx
 * Description : 스트리밍 생성/수정 폼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.07.30  임도헌   Created    app/streams/add/page에서 form 분리
 * 2025.07.30  임도헌   Modified   스트리밍 등록/수정 폼 통합 컴포넌트로 수정
 * 2025.08.22  임도헌   Modified   Cloudflare 업로드 표준화 응답 반영(유니온 내로잉), 이미지 URL 하드코딩 제거 및 env 사용(HASH)
 * 2025.08.22  임도헌   Modified   alert → toast로 변경, 에러 배열 전달 방식 정리
 * 2025.08.22  임도헌   Modified   visibility onChange를 register 옵션으로 이전
 * 2025.09.09  임도헌   Modified   Cloudflare Image URL에 variant(env) 추가, 소분류 초기화 resetField 적용, 타입/UX/a11y 보강
 * 2025.09.15  임도헌   Modified   LiveInput/Broadcast 모델 반영, 결과 모달 그대로 사용
 * 2026.01.14  임도헌   Modified   Select 컴포넌트 적용 및 스타일 통일
 * 2026.01.17  임도헌   Moved      components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified   주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified   모달 Dynamic Import 적용
 * 2026.02.28  임도헌   Modified   formData 생성 로직 표준화 및 가독성 개선
 * 2026.03.07  임도헌   Modified   실패 피드백 구체화 및 명시적 취소 경로 추가(v1.2)
 * 2026.03.08  임도헌   Modified   FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반 커스텀 검증 UX 및 대/소분류 에러 표시 위치 정리
 * 2026.03.12  임도헌   Modified   방송 카테고리 검증, RTMP 안내, 서버 fieldErrors 처리 흐름 명확화
 * 2026.03.12  임도헌   Modified   사용자 업로드 썸네일의 애니메이션 메타를 저장하고 GIF만 조건부 최적화 예외 처리
 * 2026.03.14  임도헌   Modified   썸네일 최대 수 안내와 공개 설정 섹션 레이아웃을 보강해 모바일/데스크톱 작성 흐름을 정리
 * 2026.03.24  임도헌   Modified   생성 성공 토스트를 송출 준비 단계에 맞는 문구로 조정
 * 2026.03.28  임도헌   Modified   추가/수정 폼 카테고리 Select는 이모지 없이 텍스트 라벨만 노출하도록 정리
 * 2026.04.02  임도헌   Modified   Cloudflare 썸네일 base URL 생성을 stream image utils 기준으로 통일
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useImageUpload } from "@/hooks/useImageUpload";
import { getUploadUrl } from "@/lib/cloudflareImages";
import {
  STREAM_VISIBILITY,
  STREAM_VISIBILITY_DISPLAY,
} from "@/features/stream/constants";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/global/ImageUploader";
import Select from "@/components/ui/Select";
import TagInput from "@/components/ui/TagInput";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import { streamFormSchema, StreamFormValues } from "@/features/stream/schemas";
import type { StreamCategory } from "@/features/stream/types";
import type { CreateBroadcastResult } from "@/features/stream/types";
import { buildStreamImageDeliveryUrl } from "@/features/stream/utils/image";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import { cn } from "@/lib/utils";

const RTMPInfoModal = dynamic(
  () => import("@/features/stream/components/RTMPInfoModal"),
  { ssr: false }
);

interface StreamFormProps {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<CreateBroadcastResult>;
  categories: StreamCategory[];
  defaultValues?: Partial<StreamFormValues>;
  cancelHref?: string;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * 방송 생성/수정 폼
 *
 * [기능]
 * 1. 방송 제목, 설명, 공개 설정(Public/Private/Followers) 입력
 * 2. 썸네일 이미지 업로드 (Cloudflare Images)
 * 3. 카테고리 및 태그 설정
 * 4. 폼 제출 후 성공 시 `RTMPInfoModal`을 띄워 OBS 송출 정보 제공
 *
 * @param {StreamFormProps} props
 */
export default function StreamForm({
  mode,
  action,
  categories,
  defaultValues,
  cancelHref = "/streams",
}: StreamFormProps) {
  // 대분류 초기값 추론
  const initialMainCategory = useMemo<number | null>(() => {
    if (!defaultValues?.streamCategoryId) return null;
    // Prisma 타입과 내부 정의 타입 호환성 (any casting 회피를 위해 as any 사용 가능)
    const cat = categories.find(
      (c: any) => c.id === defaultValues.streamCategoryId
    );
    return (cat as any)?.parentId ?? null;
  }, [categories, defaultValues?.streamCategoryId]);

  const [selectedMainCategory, setSelectedMainCategory] = useState<
    number | null
  >(initialMainCategory);

  const [streamInfo, setStreamInfo] = useState<{
    liveInputId: number;
    broadcastId?: number | null;
    streamKey: string;
    rtmpUrl: string;
  } | null>(null);
  const [showStreamInfo, setShowStreamInfo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    resetField,
    control,
    watch,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<StreamFormValues>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: {
      title: "",
      description: "",
      thumbnail: "",
      thumbnailAnimated: false,
      visibility: STREAM_VISIBILITY.PUBLIC,
      password: "",
      streamCategoryId: undefined as unknown as number,
      tags: [],
      ...defaultValues,
    },
  });

  const watchVisibility = watch("visibility");
  const isPrivateVisibilitySelected =
    watchVisibility === STREAM_VISIBILITY.PRIVATE;

  // PRIVATE가 아니면 password 필드 초기화
  useEffect(() => {
    if (watchVisibility !== STREAM_VISIBILITY.PRIVATE) {
      setValue("password", "");
    }
  }, [watchVisibility, setValue]);

  const {
    previews,
    files,
    isImageFormOpen,
    setIsImageFormOpen,
    handleImageChange,
    handleImageDrop,
    handleDeleteImage,
    handleDragEnd,
  } = useImageUpload({ maxImages: 1, setValue, getValues });

  // 카테고리 필터링 (대분류/소분류)
  // StreamCategory 타입이 Prisma 모델과 약간 다를 수 있으므로 as any 활용
  const mainCategories = useMemo(
    () => categories.filter((c: any) => !c.parentId),
    [categories]
  );
  const subCategories = useMemo(
    () => categories.filter((c: any) => c.parentId === selectedMainCategory),
    [categories, selectedMainCategory]
  );
  const categoryErrorMessage = errors.streamCategoryId?.message;
  const mainCategoryErrors =
    categoryErrorMessage && !selectedMainCategory ? [categoryErrorMessage] : [];
  const subCategoryErrors =
    categoryErrorMessage && selectedMainCategory ? [categoryErrorMessage] : [];

  const handleMainCategoryChange = (value: string) => {
    const id = value ? Number(value) : null;
    setSelectedMainCategory(id);
    resetField("streamCategoryId");
  };

  const onSubmit = async (data: StreamFormValues) => {
    try {
      // 1) 썸네일 업로드
      let thumbnail = data.thumbnail;
      let thumbnailAnimated = data.thumbnailAnimated ?? false;

      if (files.length > 0) {
        if (!CF_HASH) {
          throw new Error("Cloudflare 환경변수가 설정되지 않았습니다.");
        }
        const res = await getUploadUrl();
        if (!res.success) {
          throw new Error(res.error ?? "Failed to get upload URL");
        }

        const uploadBody = new FormData();
        uploadBody.append("file", files[0]);

        const uploadResp = await fetch(res.result.uploadURL, {
          method: "POST",
          body: uploadBody,
        });
        if (!uploadResp.ok) throw new Error("이미지 업로드 실패");

        thumbnail = buildStreamImageDeliveryUrl(CF_HASH, res.result.id);
        thumbnailAnimated = files[0]?.type === "image/gif";
      }

      // 2. 폼 데이터 생성 (표준화)
      const formData = new FormData();

      // [특수 필드 1] JSON 직렬화
      formData.append("tags", JSON.stringify((data.tags ?? []).slice(0, 5)));

      // [자동화] 나머지 필드들
      const skipFields = ["tags", "thumbnail"];
      Object.entries(data).forEach(([key, value]) => {
        if (
          !skipFields.includes(key) &&
          value !== undefined &&
          value !== null
        ) {
          formData.append(key, value.toString());
        }
      });

      // 썸네일은 위에서 처리된 URL 할당
      formData.append("thumbnail", thumbnail ?? "");
      formData.append("thumbnailAnimated", String(thumbnailAnimated));

      // 3. 서버 액션 호출
      const result = await action(formData);

      if (!result.success) {
        if (result.fieldErrors) {
          applyFieldErrors<StreamFormValues>(setError, result.fieldErrors, {
            setFocus,
          });
        }
        toast.error(
          result.error ??
            (mode === "create"
              ? "방송 생성에 실패했습니다. 제목, 카테고리, 공개 설정을 확인한 뒤 다시 시도해주세요."
              : "방송 수정에 실패했습니다. 변경한 항목을 확인한 뒤 다시 시도해주세요.")
        );
        return;
      }

      // 4. 성공 시 결과 저장 및 모달 오픈
      setStreamInfo({
        liveInputId: result.liveInputId!,
        broadcastId: result.broadcastId ?? null,
        streamKey: result.streamKey!,
        rtmpUrl: result.rtmpUrl!,
      });
      setShowStreamInfo(true);

      toast.success(
        mode === "create"
          ? "송출 정보가 준비되었습니다. RTMP 정보를 확인한 뒤 방송을 시작하세요."
          : "방송 정보가 수정되었습니다.",
        { duration: 3000 }
      );
    } catch (error) {
      console.error("[StreamForm] submit failed:", error);
      toast.error(
        mode === "create"
          ? "방송 생성 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
          : "방송 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    }
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<StreamFormValues>(formErrors, setFocus);
  };

  return (
    <div className="bg-background px-4 py-6">
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex flex-col gap-6"
        noValidate
      >
        <FormErrorSummary errors={errors} />

        <Input
          label="방송 제목"
          placeholder="방송 제목을 입력하세요 (5자 이상)"
          errors={errors.title?.message ? [errors.title.message] : []}
          {...register("title")}
        />
        <Input
          type="textarea"
          label="방송 설명"
          placeholder="방송에 대해 설명해주세요"
          errors={
            errors.description?.message ? [errors.description.message] : []
          }
          {...register("description")}
          className="min-h-[120px]"
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-primary">썸네일</label>
          <ImageUploader
            previews={previews}
            onImageChange={handleImageChange}
            onImageDrop={handleImageDrop}
            onDeleteImage={handleDeleteImage}
            onDragEnd={handleDragEnd}
            isOpen={isImageFormOpen}
            onToggle={() => setIsImageFormOpen(!isImageFormOpen)}
            maxImages={1}
            optional
          />
          <p className="text-xs text-muted pl-1">
            방송 썸네일은 최대 1장까지 업로드할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="대분류"
            value={selectedMainCategory?.toString() || ""}
            onChange={(e) => handleMainCategoryChange(e.target.value)}
            errors={mainCategoryErrors}
          >
            <option value="">대분류 선택</option>
            {mainCategories.map((c: any) => (
              <option key={c.id} value={String(c.id)}>
                {c.kor_name}
              </option>
            ))}
          </Select>

          <Select
            label="소분류"
            {...register("streamCategoryId")}
            disabled={!selectedMainCategory}
            errors={subCategoryErrors}
          >
            <option value="">소분류 선택</option>
            {subCategories.map((c: any) => (
              <option key={c.id} value={String(c.id)}>
                {c.kor_name}
              </option>
            ))}
          </Select>
        </div>

        <TagInput name="tags" control={control} maxTags={5} />

        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            isPrivateVisibilitySelected && "md:grid-cols-2"
          )}
        >
          <div className="flex flex-col gap-2">
            <Select
              label="공개 설정"
              {...register("visibility", {
                onChange: (e) =>
                  setValue(
                    "visibility",
                    e.target.value as StreamFormValues["visibility"]
                  ),
              })}
            >
              <option value={STREAM_VISIBILITY.PUBLIC}>
                {STREAM_VISIBILITY_DISPLAY.PUBLIC}
              </option>
              <option value={STREAM_VISIBILITY.PRIVATE}>
                {STREAM_VISIBILITY_DISPLAY.PRIVATE}
              </option>
              <option value={STREAM_VISIBILITY.FOLLOWERS}>
                {STREAM_VISIBILITY_DISPLAY.FOLLOWERS}
              </option>
            </Select>
            <p className="text-xs text-muted pl-1">
              {isPrivateVisibilitySelected
                ? "비밀번호를 아는 사용자만 방송에 입장할 수 있습니다."
                : watchVisibility === STREAM_VISIBILITY.FOLLOWERS
                  ? "나를 팔로우한 사용자만 방송에 입장할 수 있습니다."
                  : "누구나 바로 입장할 수 있는 공개 방송입니다."}
            </p>
          </div>

          {isPrivateVisibilitySelected && (
            <Input
              label="비밀번호"
              type="password"
              placeholder="비밀번호 입력"
              {...register("password")}
              errors={errors.password?.message ? [errors.password.message] : []}
            />
          )}
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Button
            disabled={isSubmitting}
            text={mode === "create" ? "방송 시작하기" : "방송 수정하기"}
          />

          <Link
            href={cancelHref}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            취소
          </Link>
        </div>
      </form>

      {/* OBS 정보 모달 */}
      {showStreamInfo && streamInfo && (
        <RTMPInfoModal
          open={showStreamInfo}
          onOpenChange={setShowStreamInfo}
          rtmpUrl={streamInfo.rtmpUrl}
          streamKey={streamInfo.streamKey}
          liveInputId={streamInfo.liveInputId}
          broadcastId={streamInfo.broadcastId ?? undefined}
        />
      )}
    </div>
  );
}
