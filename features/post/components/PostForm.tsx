/**
 * File Name : features/post/components/PostForm.tsx
 * Description : 게시글 작성/수정 공통 폼 (add + edit)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.04  임도헌   Created   기존 add/page.tsx + PostEditForm 기능 통합
 * 2025.09.10  임도헌   Modified  getUploadUrl 유니온 분기 처리로 TS 에러 해결 + File 타입 가드
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 Select 컴포넌트 교체
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.01  임도헌   Modified  Prop rename: onSubmit -> action
 * 2026.02.14  임도헌   Modified  지도 기능 추가
 * 2026.02.25  임도헌   Modified  Cloudflare Images hash 하드코딩 제거
 * 2026.02.26  임도헌   Modified  게시글 작성 후 push에서 replace로 수정
 * 2026.02.28  임도헌   Modified  formData 생성 로직 표준화 및 가독성 개선
 * 2026.03.01  임도헌   Modified  tanstack query 도입
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  실패 토스트를 상황 중심 문구로 구체화(v1.2)
 */
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import TagInput from "@/components/ui/TagInput";
import ImageUploader from "@/components/global/ImageUploader";
import LocationPicker from "@/features/map/components/LocationPicker";
import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useImageUpload } from "@/hooks/useImageUpload";
import { POST_CATEGORY } from "@/features/post/constants";
import { queryKeys } from "@/lib/queryKeys";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { postFormSchema, PostFormValues } from "@/features/post/schemas";
import type { PostActionResponse } from "@/features/post/types";
import type { LocationData } from "@/features/map/types";

interface PostFormProps {
  initialValues?: PostFormValues & { id?: number };
  action: (formData: FormData) => Promise<PostActionResponse>;
  backUrl: string;
  submitLabel?: string;
  isEdit?: boolean;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * 게시글 작성/수정 폼
 *
 * [상태 주입 및 상호작용 로직]
 * - `useForm` 기반 폼 상태 관리 및 Zod 스키마 연동 유효성 검증 적용
 * - Cloudflare Images API 연동을 통한 다중 이미지 업로드 및 미리보기 생성 로직 포함
 * - 카테고리, 태그, 지도 기반 위치(Location) 데이터 매핑 기능 제공
 * - 폼 제출 시 주입된 Action 호출 및 결과에 따른 화면 리다이렉트 처리
 *
 * @param {PostFormProps} props - 초기값, 액션 핸들러, 모드 설정 등
 */
export default function PostForm({
  initialValues,
  action,
  backUrl,
  submitLabel = "작성 완료",
  isEdit = false,
}: PostFormProps) {
  const router = useRouter();
  // 쿼리 클라이언트 인스턴스 가져오기
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    getValues,
    reset,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: initialValues || {
      title: "",
      description: "",
      category: "",
      photos: [],
      tags: [],
      location: null,
    },
  });

  const {
    previews,
    files,
    isImageFormOpen,
    setIsImageFormOpen,
    handleImageChange,
    handleImageDrop,
    handleDeleteImage,
    handleDragEnd,
    setPreviews,
    resetImage,
  } = useImageUpload({ maxImages: 5, setValue, getValues });

  // 초기 이미지 설정 (수정 모드)
  useEffect(() => {
    if (isEdit && initialValues?.photos?.length) {
      setPreviews(initialValues.photos.map((url) => url + "/public"));
      setValue("photos", initialValues.photos);
    }
  }, [isEdit, initialValues?.photos, setValue, setPreviews]);

  const resetForm = () => {
    resetImage();
    reset();
    setResetSignal((prev) => prev + 1);
  };

  // 위치 관련 상태
  const [isMapOpen, setIsMapOpen] = useState(false);
  const location = watch("location");

  // 위치 선택 핸들러
  const handleLocationSelect = (data: LocationData) => {
    setValue("location", data, { shouldDirty: true });
    setIsMapOpen(false);
  };

  const onSubmit = handleSubmit(async (data: PostFormValues) => {
    setIsUploading(true);

    try {
      const newFiles = files.filter((f): f is File => f instanceof File);
      const uploadedPhotoUrls: string[] = [];

      // 1. 신규 이미지 업로드
      if (newFiles.length > 0) {
        if (!CF_HASH) throw new Error("Cloudflare 설정 오류");

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

      // 2. 최종 이미지 URL 조합 (기존 + 신규)
      const allPhotoUrls = previews
        .map((preview) => {
          if (preview.includes("imagedelivery.net")) {
            return preview.replace("/public", "");
          } else if (preview.startsWith("blob:")) {
            const index = previews
              .filter((p) => p.startsWith("blob:"))
              .indexOf(preview);
            return uploadedPhotoUrls[index] ?? "";
          }
          return preview;
        })
        .filter(Boolean);

      // 3. 폼 데이터 생성 (표준화)
      const formData = new FormData();

      // [특수 필드 1] ID (수정 모드)
      if (isEdit && initialValues?.id) {
        formData.append("id", initialValues.id.toString());
      }

      // [특수 필드 2] JSON 직렬화
      if (data.location) {
        formData.append("location", JSON.stringify(data.location));
      }
      formData.append("tags", JSON.stringify(data.tags || []));

      // [특수 필드 3] 이미지 배열
      allPhotoUrls.forEach((url) => formData.append("photos[]", url));

      // [일반 필드] 자동 매핑
      const skipFields = ["id", "location", "tags", "photos"];
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

      if (result.success && result.postId) {
        // 데이터 변경이 성공했으므로 캐시를 무효화하여 다음 방문 시 새로고침을 유도함
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
        toast.success(
          isEdit ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다."
        );
        router.replace(`/posts/${result.postId}`);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        isEdit
          ? "게시글 수정 중 문제가 발생했습니다. 입력 내용과 네트워크 상태를 확인한 뒤 다시 시도해주세요."
          : "게시글 등록 중 문제가 발생했습니다. 이미지 업로드와 입력 내용을 확인한 뒤 다시 시도해주세요."
      );
    } finally {
      setIsUploading(false);
    }
  });

  return (
    <div className="bg-background">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-form-gap px-page-x py-page-y"
      >
        {/* Image Uploader */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-primary">이미지</label>
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
        </div>

        {/* Category Select */}
        <Select
          label="카테고리"
          {...register("category")}
          errors={errors.category?.message ? [errors.category.message] : []}
        >
          <option value="">카테고리 선택</option>
          {Object.entries(POST_CATEGORY).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </Select>

        <Input
          label="제목"
          type="text"
          placeholder="제목을 입력해주세요"
          {...register("title")}
          errors={[errors.title?.message ?? ""]}
        />

        <Input
          label="내용"
          type="textarea"
          placeholder="내용을 입력해주세요"
          {...register("description")}
          errors={[errors.description?.message ?? ""]}
          className="min-h-[240px]"
        />

        <TagInput
          name="tags"
          control={control}
          maxTags={5}
          resetSignal={resetSignal}
        />
        {/* 위치 추가 섹션 */}
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-sm font-medium text-primary flex items-center gap-1">
            <MapPinIcon className="size-4" />
            장소 태그{" "}
            <span className="text-muted font-normal">
              (모임 장소, 후기 위치 등)
            </span>
          </label>

          {location ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-brand/30 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light rounded-full">
                  <MapPinIcon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">
                    {location.locationName}
                  </p>
                  <p className="text-xs text-muted">
                    {location.region1} {location.region2} {location.region3}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="text-xs font-medium text-muted hover:text-primary px-2 py-1"
                >
                  변경
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue("location", null, { shouldDirty: true })
                  }
                  className="text-muted hover:text-danger p-1"
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
              <span className="text-sm">지도에서 위치 찾기</span>
            </button>
          )}
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Button
            text={
              isUploading
                ? isEdit
                  ? "수정 중..."
                  : "업로드 중..."
                : submitLabel
            }
            disabled={isUploading}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="h-12 rounded-xl font-medium text-sm border border-border bg-surface text-muted hover:bg-surface-dim transition-colors"
              disabled={isUploading}
            >
              초기화
            </button>
            <Link
              href={backUrl}
              className="flex items-center justify-center h-12 rounded-xl font-medium text-sm border border-border bg-surface text-muted hover:bg-surface-dim transition-colors"
            >
              취소
            </Link>
          </div>
        </div>
      </form>
      {/*  지도 모달 */}
      {isMapOpen && (
        <LocationPicker
          onClose={() => setIsMapOpen(false)}
          onSelect={handleLocationSelect}
          initialData={location ?? undefined}
        />
      )}
    </div>
  );
}
