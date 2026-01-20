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
 */
"use client";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useImageUpload } from "@/hooks/useImageUpload";
import ImageUploader from "@/components/global/ImageUploader";
import TagInput from "@/components/ui/TagInput";
import { POST_CATEGORY } from "@/lib/constants";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { useRouter } from "next/navigation";
import {
  postFormSchema,
  PostFormValues,
} from "@/features/post/lib/postFormSchema";
import { toast } from "sonner";

interface PostFormProps {
  initialValues?: PostFormValues & { id?: number };
  onSubmit: (
    formData: FormData
  ) => Promise<{ success: boolean; postId?: number; error?: string }>;
  backUrl: string;
  submitLabel?: string;
  isEdit?: boolean;
}

export default function PostForm({
  initialValues,
  onSubmit,
  backUrl,
  submitLabel = "작성 완료",
  isEdit = false,
}: PostFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const {
    register,
    handleSubmit,
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
    },
  });

  const {
    previews,
    files,
    isImageFormOpen,
    setIsImageFormOpen,
    handleImageChange,
    handleDeleteImage,
    handleDragEnd,
    setPreviews,
    resetImage: resetImages,
  } = useImageUpload({ maxImages: 5, setValue, getValues });

  // 초기 이미지 설정 (수정 모드)
  useEffect(() => {
    if (isEdit && initialValues?.photos?.length) {
      setPreviews(initialValues.photos.map((url) => url + "/public"));
      setValue("photos", initialValues.photos);
    }
  }, [isEdit, initialValues?.photos, setValue, setPreviews]);

  const resetForm = () => {
    resetImages();
    reset();
    setResetSignal((prev) => prev + 1);
  };

  const submitHandler = handleSubmit(async (data: PostFormValues) => {
    setIsUploading(true);

    try {
      const newFiles = files.filter((f): f is File => f instanceof File);
      const uploadedPhotoUrls: string[] = [];

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

          return `https://imagedelivery.net/3o3hwIVwLhMgAkoMCda2JQ/${id}`;
        });

        const urls = await Promise.all(uploadPromises);
        uploadedPhotoUrls.push(...urls);
      }

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

      const formData = new FormData();
      if (isEdit && initialValues?.id) {
        formData.append("id", initialValues.id.toString());
      }
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      data.tags?.forEach((tag) => formData.append("tags[]", tag));
      allPhotoUrls.forEach((url) => formData.append("photos[]", url));

      const result = await onSubmit(formData);

      if (result.success && result.postId) {
        toast.success(
          isEdit ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다."
        );
        router.push(`/posts/${result.postId}`);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("게시글 처리에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  });

  return (
    <div className="bg-background">
      <form
        onSubmit={submitHandler}
        className="flex flex-col gap-form-gap px-page-x py-page-y"
      >
        {/* Image Uploader */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-primary">이미지</label>
          <ImageUploader
            previews={previews}
            onImageChange={handleImageChange}
            onDeleteImage={handleDeleteImage}
            onDragEnd={handleDragEnd}
            isOpen={isImageFormOpen}
            onToggle={() => setIsImageFormOpen(!isImageFormOpen)}
            isUploading={isUploading}
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
    </div>
  );
}
