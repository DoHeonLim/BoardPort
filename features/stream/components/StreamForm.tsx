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
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useImageUpload } from "@/hooks/useImageUpload";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { STREAM_VISIBILITY, STREAM_VISIBILITY_DISPLAY } from "@/lib/constants";
import {
  streamFormSchema,
  StreamFormValues,
} from "@/features/stream/lib/streamFormSchema";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/global/ImageUploader";
import Select from "@/components/ui/Select";
import TagInput from "@/components/ui/TagInput";
import RTMPInfoModal from "@/features/stream/components/RTMPInfoModal";
import type { StreamCategory } from "@/generated/prisma/client";
import type { CreateBroadcastResult } from "@/types/stream";

interface StreamFormProps {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<CreateBroadcastResult>;
  categories: StreamCategory[];
  defaultValues?: Partial<StreamFormValues>;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

export default function StreamForm({
  mode,
  action,
  categories,
  defaultValues,
}: StreamFormProps) {
  // 대분류 초기값: 기본 소분류(defaultValues.streamCategoryId)의 parentId를 역추적
  const initialMainCategory = useMemo<number | null>(() => {
    if (!defaultValues?.streamCategoryId) return null;
    return (
      categories.find((c) => c.id === defaultValues.streamCategoryId)
        ?.parentId ?? null
    );
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
    formState: { errors, isSubmitting },
  } = useForm<StreamFormValues>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: {
      title: "",
      description: "",
      thumbnail: "",
      visibility: STREAM_VISIBILITY.PUBLIC,
      password: "",
      streamCategoryId: undefined as unknown as number,
      tags: [],
      ...defaultValues,
    },
  });

  const watchVisibility = watch("visibility");

  // PRIVATE가 아니면 password 초기화
  useEffect(() => {
    if (watchVisibility !== STREAM_VISIBILITY.PRIVATE) {
      setValue("password", "");
    }
  }, [watchVisibility, setValue]);

  // 이미지 업로드 훅 (1장만)
  const {
    previews,
    files,
    isImageFormOpen,
    setIsImageFormOpen,
    handleImageChange,
    handleDeleteImage,
    handleDragEnd,
  } = useImageUpload({ maxImages: 1, setValue, getValues });

  // 대/소분류 옵션
  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );
  const subCategories = useMemo(
    () => categories.filter((c) => c.parentId === selectedMainCategory),
    [categories, selectedMainCategory]
  );

  const handleMainCategoryChange = (value: string) => {
    const id = value ? Number(value) : null;
    setSelectedMainCategory(id);
    resetField("streamCategoryId");
  };

  const onSubmit = async (data: StreamFormValues) => {
    try {
      // 1) 썸네일 업로드(선택)
      let thumbnail = data.thumbnail;

      if (files.length > 0) {
        if (!CF_HASH) {
          throw new Error(
            "Cloudflare 공개 해시(NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH)가 설정되지 않았습니다."
          );
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

        thumbnail = `https://imagedelivery.net/${CF_HASH}/${res.result.id}`;
      }

      // 2) 서버 액션 호출
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description ?? "");
      formData.append("thumbnail", thumbnail ?? "");
      formData.append("visibility", data.visibility);
      formData.append("password", data.password ?? "");
      if (typeof data.streamCategoryId === "number") {
        formData.append("streamCategoryId", String(data.streamCategoryId));
      } else {
        formData.append("streamCategoryId", "");
      }
      formData.append("tags", JSON.stringify((data.tags ?? []).slice(0, 5)));

      const result = await action(formData);

      if (!result.success) {
        toast.error(result.error ?? "스트리밍 처리 중 오류가 발생했습니다.");
        return;
      }

      // 새 응답 필드에 맞춰 저장
      setStreamInfo({
        liveInputId: result.liveInputId!, // 필수
        broadcastId: result.broadcastId ?? null, // 선택
        streamKey: result.streamKey!, // 필수
        rtmpUrl: result.rtmpUrl!, // 필수
      });
      setShowStreamInfo(true);

      toast.success(
        // create/edit 공통 문구여도 무방. 필요시 mode별 문구 분기
        "스트리밍이 생성되었습니다."
      );
    } catch (error) {
      console.error("[StreamForm] submit failed:", error);
      toast.error("스트리밍 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="bg-background px-4 py-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* title */}
        <Input
          label="방송 제목"
          placeholder="방송 제목을 입력하세요 (5자 이상)"
          errors={errors.title?.message ? [errors.title.message] : []}
          {...register("title")}
        />
        {/* description */}
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
          {/* image */}
          <ImageUploader
            previews={previews}
            onImageChange={handleImageChange}
            onDeleteImage={handleDeleteImage}
            onDragEnd={handleDragEnd}
            isOpen={isImageFormOpen}
            onToggle={() => setIsImageFormOpen(!isImageFormOpen)}
            maxImages={1}
            optional
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* category */}
          <Select
            label="대분류"
            value={selectedMainCategory?.toString() || ""}
            onChange={(e) => handleMainCategoryChange(e.target.value)}
            errors={
              errors.streamCategoryId?.message
                ? [errors.streamCategoryId.message]
                : []
            }
          >
            <option value="">대분류 선택</option>
            {mainCategories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.icon} {c.kor_name}
              </option>
            ))}
          </Select>

          <Select
            label="소분류"
            {...register("streamCategoryId")}
            disabled={!selectedMainCategory}
            errors={
              errors.streamCategoryId?.message
                ? [errors.streamCategoryId.message]
                : []
            }
          >
            <option value="">소분류 선택</option>
            {subCategories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.icon} {c.kor_name}
              </option>
            ))}
          </Select>
        </div>

        {/* tags */}
        <TagInput name="tags" control={control} maxTags={5} />

        {/* visibility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* stream password */}
          {watchVisibility === STREAM_VISIBILITY.PRIVATE && (
            <Input
              label="비밀번호"
              type="password"
              placeholder="비밀번호 입력"
              {...register("password")}
              errors={errors.password?.message ? [errors.password.message] : []}
            />
          )}
        </div>

        <Button
          disabled={isSubmitting}
          text={mode === "create" ? "방송 시작하기" : "방송 수정하기"}
        />
      </form>

      {/* stream Info 및 key Info*/}
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
