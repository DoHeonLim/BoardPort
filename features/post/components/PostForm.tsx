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
 * 2026.03.08  임도헌   Modified  FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반의 커스텀 검증 UX 적용
 * 2026.03.12  임도헌   Modified  게시글 업로드, 커스텀 검증 UX, 서버 fieldErrors 처리 흐름 명확화
 * 2026.03.12  임도헌   Modified  사용자 업로드 이미지의 애니메이션 메타를 저장하고 GIF만 조건부 최적화 예외 처리
 * 2026.03.14  임도헌   Modified  상세에서 진입한 수정 흐름은 공통 세션 refresh 플래그를 기록한 뒤 back 복귀하고 상세 화면은 1회만 최신화하도록 정리
 * 2026.03.14  임도헌   Modified  수정 모드 리셋은 원래 값 복원으로 정리하고 이미지 최대 수 안내 및 버튼 레이블을 보강
 * 2026.03.28  임도헌   Modified  추가/수정 폼 카테고리 Select는 이모지 없이 텍스트 라벨만 노출하도록 정리
 * 2026.03.30  임도헌   Modified  게시글 동영상 첨부 1차 도입을 위해 direct upload UI와 draftKey 연결 필드 추가
 * 2026.03.30  임도헌   Modified  텍스트/영상/이미지 배치 순서를 조절하는 가벼운 블록 편집기 UI 추가
 * 2026.03.31  임도헌   Modified  동영상/이미지 블록 첨부 상태를 전용 훅으로 분리해 폼은 제출과 블록 조립에 집중하도록 정리
 * 2026.04.01  임도헌   Modified  게시글 detail-edit 저장/취소는 history back을 우선 사용해 상세 히스토리 문맥을 복원하도록 조정
 */
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { DropResult } from "@hello-pangea/dnd";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import TagInput from "@/components/ui/TagInput";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import LocationPicker from "@/features/map/components/LocationPicker";
import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  POST_CATEGORY,
  POST_CATEGORY_FORM_LABEL,
} from "@/features/post/constants";
import { queryKeys } from "@/lib/queryKeys";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { postFormSchema, PostFormValues } from "@/features/post/schemas";
import PostEditorBlocksField from "@/features/post/components/PostEditorBlocksField";
import type {
  PostActionResponse,
  PostBlock,
  PostEditorBlock,
  PostVideo,
} from "@/features/post/types";
import type { LocationData } from "@/features/map/types";
import {
  createImageEditorBlock,
  createEmbedEditorBlock,
  createTextEditorBlock,
  deriveInitialEditorBlocks,
  deriveInitialImageBlockAssets,
  getDescriptionFromEditorBlocks,
} from "@/features/post/utils/editor";
import { parseYouTubeEmbedInput } from "@/features/post/utils/embed";
import { usePostImageBlocks } from "@/features/post/hooks/usePostImageBlocks";
import { usePostVideoUpload } from "@/features/post/hooks/usePostVideoUpload";
import { applyFieldErrors } from "@/lib/applyFieldErrors";
import { focusFirstFieldError } from "@/lib/focusFirstFieldError";
import {
  createNavigationRefreshFlagKey,
  setNavigationRefreshFlag,
} from "@/lib/navigationRefreshFlag";

interface PostFormProps {
  initialValues?: PostFormValues & { id?: number };
  initialVideo?: PostVideo | null;
  initialBlocks?: PostBlock[];
  action: (formData: FormData) => Promise<PostActionResponse>;
  backUrl: string;
  submitLabel?: string;
  isEdit?: boolean;
  editFlow?: string;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

/**
 * 게시글 작성/수정 폼
 *
 * [상태 주입 및 상호작용 로직]
 * - `useForm` 기반 폼 상태 관리 및 Zod 스키마 연동 유효성 검증 적용
 * - 블록/미디어 상태 관리와 제출용 FormData 조립을 담당
 * - 블록 렌더링 UI는 `PostEditorBlocksField`, 순수 초기화 헬퍼는 `utils/editor`로 분리
 * - 카테고리, 태그, 지도 기반 위치(Location) 데이터 매핑 기능 제공
 * - FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반의 검증 UX 적용
 * - 폼 제출 시 주입된 Action 호출 및 결과에 따른 화면 리다이렉트 처리
 *
 * @param {PostFormProps} props - 초기값, 액션 핸들러, 모드 설정 등
 */
export default function PostForm({
  initialValues,
  initialVideo,
  initialBlocks,
  action,
  backUrl,
  submitLabel = "작성 완료",
  isEdit = false,
  editFlow,
}: PostFormProps) {
  const router = useRouter();
  // 쿼리 클라이언트 인스턴스 가져오기
  const queryClient = useQueryClient();
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const initialFormValues = useMemo(
    () =>
      initialValues || {
        title: "",
        description: "",
        category: "",
        photos: [],
        photosAnimated: [],
        videoDraftKey: null,
        hasAttachedVideo: false,
        removeVideo: false,
        tags: [],
        location: null,
      },
    [initialValues]
  );

  // 편집기 초기 블록
  const initialEditorBlocks = useMemo(
    () =>
      deriveInitialEditorBlocks(
        initialFormValues.description ?? "",
        initialBlocks
      ),
    [initialBlocks, initialFormValues]
  );

  // 이미지 블록 초기 자산
  const initialImageBlockAssets = useMemo(
    () =>
      deriveInitialImageBlockAssets(
        initialEditorBlocks,
        initialFormValues.photos ?? [],
        initialFormValues.photosAnimated ?? []
      ),
    [initialEditorBlocks, initialFormValues]
  );

  const [isUploading, setIsUploading] = useState(false);
  const [editorBlocks, setEditorBlocks] =
    useState<PostEditorBlock[]>(initialEditorBlocks);
  const [resetSignal, setResetSignal] = useState(0);
  const maxImages = 5;

  // 상세 진입 편집 복귀
  // detail-edit는 edit 페이지를 push로 열고 저장/취소 시 history back을 우선 사용
  // 직접 진입처럼 back 대상이 불확실한 경우만 안전 경로로 replace
  const returnToDetailEditOrigin = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(backUrl);
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    reset,
    setError,
    setFocus,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: initialFormValues,
  });
  const {
    isVideoUploading,
    videoFileName,
    videoState,
    clearVideo,
    resetVideo,
    handleVideoFiles,
  } = usePostVideoUpload({
    initialVideo,
    setValue,
  });
  const hasVideoBlock = editorBlocks.some((block) => block.type === "VIDEO");
  const isEditorLocked = isUploading;
  const {
    imageBlockAssets,
    removeImageBlockAsset,
    handleImageBlockChange,
    handleImageBlockDrop,
    resetImageBlockAssets,
  } = usePostImageBlocks({
    initialImageBlockAssets,
    editorBlocks,
    setEditorBlocks,
    maxImages,
    scrollToBlock: (blockId: string) => {
      requestAnimationFrame(() => {
        blockRefs.current[blockId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    },
  });

  // 편집기 값 동기화
  useEffect(() => {
    setValue("description", getDescriptionFromEditorBlocks(editorBlocks), {
      shouldDirty: false,
      shouldValidate: false,
    });
    setValue("blocks", editorBlocks, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [editorBlocks, setValue]);

  // 초기 블록 복원
  useEffect(() => {
    setEditorBlocks(initialEditorBlocks);
  }, [initialEditorBlocks, initialImageBlockAssets]);

  // 이미지 순서 동기화
  // IMAGE 블록의 현재 순서를 photos / photosAnimated에 다시 반영
  // 저장 후 상세에서도 편집기와 같은 미디어 순서 유지 목적
  useEffect(() => {
    const orderedImageBlocks = editorBlocks.filter(
      (block) => block.type === "IMAGE"
    );

    setValue(
      "photos",
      orderedImageBlocks
        .map((block) => imageBlockAssets[block.id]?.sourceUrl ?? "")
        .filter(Boolean),
      { shouldDirty: false, shouldValidate: false }
    );
    setValue(
      "photosAnimated",
      orderedImageBlocks
        .map((block) => imageBlockAssets[block.id]?.isAnimated ?? false)
        .slice(0, orderedImageBlocks.length),
      { shouldDirty: false, shouldValidate: false }
    );
  }, [editorBlocks, imageBlockAssets, setValue]);

  // 폼 리셋
  // RHF 값만 reset하면 블록/이미지/동영상 draft 상태가 남는 구조
  // 편집기와 미디어 훅 상태까지 함께 초기값으로 복원하는 흐름
  const resetForm = () => {
    reset(initialFormValues);
    setResetSignal((prev) => prev + 1);
    resetImageBlockAssets(initialImageBlockAssets);
    setValue("photos", initialFormValues.photos ?? []);
    setValue(
      "photosAnimated",
      initialFormValues.photosAnimated ??
        (initialFormValues.photos ?? []).map(() => false)
    );
    setValue("videoDraftKey", initialFormValues.videoDraftKey ?? null);
    setValue("removeVideo", initialFormValues.removeVideo ?? false);
    setValue("blocks", initialEditorBlocks);
    resetVideo(initialVideo ?? null);
    setEditorBlocks(initialEditorBlocks);
  };

  // 위치 관련 상태
  const [isMapOpen, setIsMapOpen] = useState(false);
  const location = watch("location");

  // 위치 선택 핸들러
  const handleLocationSelect = (data: LocationData) => {
    setValue("location", data, { shouldDirty: true });
    setIsMapOpen(false);
  };

  // 이미지 블록 추가
  // 새 블록 생성 직후 해당 위치로 스크롤
  // 긴 글에서도 방금 추가한 이미지 슬롯을 바로 채우기 위한 UX
  const addImageBlock = () => {
    if (isEditorLocked) return;

    const imageCount = editorBlocks.filter(
      (block) => block.type === "IMAGE"
    ).length;
    if (imageCount >= maxImages) {
      toast.warning(`이미지는 최대 ${maxImages}장까지 첨부할 수 있습니다.`);
      return;
    }

    const nextBlock = createImageEditorBlock();

    setEditorBlocks((prev) => [...prev, nextBlock]);
    requestAnimationFrame(() => {
      blockRefs.current[nextBlock.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  // 텍스트 블록 추가
  // 텍스트 블록 추가 직후 새 블록 위치로 이동
  // 작성 문맥 유지를 위한 보조 UX
  const addTextBlock = () => {
    if (isEditorLocked) return;

    const nextBlock = createTextEditorBlock();
    setEditorBlocks((prev) => [...prev, nextBlock]);
    requestAnimationFrame(() => {
      blockRefs.current[nextBlock.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  // 동영상 블록 추가
  // 게시글당 영상 1개 제한
  // 기존 VIDEO 블록 존재 시 추가 차단
  const addVideoBlock = () => {
    if (isEditorLocked) return;

    if (hasVideoBlock) {
      toast.warning("동영상 블록은 게시글당 1개만 추가할 수 있습니다.");
      return;
    }

    const nextBlock: PostEditorBlock = {
      id: `video-${crypto.randomUUID()}`,
      type: "VIDEO",
    };
    setEditorBlocks((prev) => [...prev, nextBlock]);
    requestAnimationFrame(() => {
      blockRefs.current[nextBlock.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  // 유튜브 임베드 블록 추가
  const addEmbedBlock = () => {
    if (isEditorLocked) return;

    const nextBlock = createEmbedEditorBlock();
    setEditorBlocks((prev) => [...prev, nextBlock]);
    requestAnimationFrame(() => {
      blockRefs.current[nextBlock.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  // 텍스트 블록 수정
  const updateTextBlock = (id: string, value: string) => {
    if (isEditorLocked) return;

    setEditorBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, textContent: value } : block
      )
    );
  };

  // 유튜브 임베드 블록 수정
  const updateEmbedBlock = (id: string, value: string) => {
    if (isEditorLocked) return;

    setEditorBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, embedUrl: value } : block
      )
    );
  };

  // 버튼 기반 블록 이동
  const moveBlock = (index: number, direction: -1 | 1) => {
    if (isEditorLocked) return;

    setEditorBlocks((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const [target] = next.splice(index, 1);
      next.splice(nextIndex, 0, target);
      return next;
    });
  };

  // 드래그 기반 블록 이동
  const handleDragEnd = (result: DropResult) => {
    if (isEditorLocked) return;

    const destination = result.destination;
    if (!destination) return;
    if (destination.index === result.source.index) return;

    setEditorBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(destination.index, 0, moved);
      return next;
    });
  };

  // 블록 제거
  const removeEditorBlock = (index: number) => {
    if (isEditorLocked) return;

    const target = editorBlocks[index];
    if (!target) return;

    if (target.type === "VIDEO") {
      clearVideo();
    }

    if (target.type === "IMAGE") {
      removeImageBlockAsset(target.id);
    }

    setEditorBlocks((prev) => {
      const next = prev.filter((_, blockIndex) => blockIndex !== index);
      return next.length ? next : [createTextEditorBlock()];
    });
  };

  // 동영상 파일 선택
  const handleVideoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await handleVideoFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  // 동영상 드래그 첨부
  const handleVideoDrop = async (
    event: React.DragEvent<HTMLDivElement | HTMLButtonElement>
  ) => {
    event.preventDefault();
    await handleVideoFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const onValid = async (data: PostFormValues) => {
    setIsUploading(true);

    try {
      const descriptionFromBlocks =
        getDescriptionFromEditorBlocks(editorBlocks);
      const hasMediaBlocks =
        editorBlocks.some(
          (block) => block.type === "IMAGE" && !!imageBlockAssets[block.id]
        ) ||
        !!videoState ||
        editorBlocks.some(
          (block) =>
            block.type === "EMBED" && !!parseYouTubeEmbedInput(block.embedUrl)
        );

      if (!descriptionFromBlocks && !hasMediaBlocks) {
        setError("description", {
          type: "manual",
          message: "내용이나 미디어를 추가해주세요.",
        });
        return;
      }

      const orderedImageBlocks = editorBlocks.filter(
        (block) => block.type === "IMAGE" && !!imageBlockAssets[block.id]
      );
      const orderedImageAssets = orderedImageBlocks.map(
        (block) => imageBlockAssets[block.id]
      );

      // 이미지 업로드 및 순서 조합
      // IMAGE 블록에 새 파일이 있으면 Cloudflare 업로드
      // 기존 URL은 그대로 유지해 최종 저장용 미디어 배열 조합
      const allPhotoUrls: string[] = [];
      const allPhotoAnimatedFlags: boolean[] = [];

      for (const asset of orderedImageAssets) {
        if (!asset) continue;

        if (asset.file) {
          if (!CF_HASH) throw new Error("Cloudflare 설정 오류");

          const res = await getUploadUrl();
          if (!res.success) {
            throw new Error(res.error || "Failed to get upload URL");
          }

          const { uploadURL, id } = res.result;
          const cloudflareForm = new FormData();
          cloudflareForm.append("file", asset.file);

          const response = await fetch(uploadURL, {
            method: "POST",
            body: cloudflareForm,
          });

          if (!response.ok) throw new Error("Failed to upload image");
          allPhotoUrls.push(`https://imagedelivery.net/${CF_HASH}/${id}`);
        } else if (asset.sourceUrl) {
          allPhotoUrls.push(asset.sourceUrl);
        }

        allPhotoAnimatedFlags.push(asset.isAnimated);
      }

      const submittedBlocks: PostEditorBlock[] = [];

      for (const block of editorBlocks) {
        if (block.type === "TEXT") {
          const trimmed = block.textContent?.trim();
          if (!trimmed) continue;
          submittedBlocks.push({ ...block, textContent: trimmed });
          continue;
        }

        if (block.type === "VIDEO") {
          if (!videoState) continue;
          submittedBlocks.push(block);
          continue;
        }

        if (block.type === "IMAGE") {
          if (!imageBlockAssets[block.id]) continue;
          submittedBlocks.push(block);
          continue;
        }

        if (block.type === "EMBED") {
          const parsedEmbed = parseYouTubeEmbedInput(block.embedUrl);
          if (!block.embedUrl?.trim()) continue;

          if (!parsedEmbed) {
            setError("description", {
              type: "manual",
              message: "유튜브 링크만 임베드할 수 있습니다.",
            });
            return;
          }

          submittedBlocks.push({
            ...block,
            embedProvider: parsedEmbed.provider,
            embedUrl: parsedEmbed.embedUrl,
            embedTitle: parsedEmbed.title,
            embedThumbnailUrl: parsedEmbed.thumbnailUrl,
          });
        }
      }

      if (!submittedBlocks.length) {
        setError("description", {
          type: "manual",
          message: "내용이나 미디어를 추가해주세요.",
        });
        return;
      }

      // FormData 조립
      // 블록 편집기 결과(blocksJson)와 description/photos 요약 필드 동시 전달
      // 블록 기반 본문과 검색/미리보기용 요약 필드를 같은 저장 기준으로 유지
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
      formData.append("blocksJson", JSON.stringify(submittedBlocks));

      // [특수 필드 3] 이미지 배열
      allPhotoUrls.forEach((url) => formData.append("photos[]", url));
      formData.append("photosAnimated", JSON.stringify(allPhotoAnimatedFlags));

      // [일반 필드] 자동 매핑
      const skipFields = [
        "id",
        "location",
        "tags",
        "photos",
        "photosAnimated",
        "hasAttachedVideo",
        "blocks",
      ];
      Object.entries(data).forEach(([key, value]) => {
        if (
          !skipFields.includes(key) &&
          value !== undefined &&
          value !== null
        ) {
          if (key === "description") {
            formData.append(key, descriptionFromBlocks);
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const result = await action(formData);

      if (result.success) {
        // 저장 성공 후 캐시 무효화
        // 목록/상세 재방문 시 최신 게시글 노출을 위한 posts 캐시 정리
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
        toast.success(
          isEdit ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다."
        );
        const nextHref =
          isEdit && backUrl
            ? `/posts/${result.postId}?returnTo=${encodeURIComponent(backUrl)}`
            : `/posts/${result.postId}`;

        if (isEdit && editFlow === "detail-edit") {
          // 상세 진입 편집 복귀
          // 저장 후에는 history back으로 원래 상세로 돌아가고
          // 상세 화면은 세션 플래그를 소비해 1회만 최신 데이터로 새로고침하는 구조
          setNavigationRefreshFlag(
            createNavigationRefreshFlagKey("post-detail-refresh", result.postId)
          );
          returnToDetailEditOrigin();
          return;
        }

        router.replace(nextHref);
        return;
      }

      if (result.fieldErrors) {
        applyFieldErrors<PostFormValues>(setError, result.fieldErrors, {
          setFocus,
        });
      }
      if (result.error) {
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
  };

  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<PostFormValues>(formErrors, setFocus);
  };

  return (
    <div className="bg-background">
      <form
        onSubmit={handleSubmit(onValid, onInvalid)}
        className="flex flex-col gap-form-gap px-page-x py-page-y"
        noValidate
      >
        <FormErrorSummary errors={errors} />
        <input type="hidden" {...register("description")} />

        {/* Category Select */}
        <Select
          label="카테고리"
          disabled={isUploading}
          {...register("category")}
          errors={errors.category?.message ? [errors.category.message] : []}
        >
          <option value="">카테고리 선택</option>
          {Object.entries(POST_CATEGORY).map(([key, value]) => (
            <option key={key} value={key}>
              {POST_CATEGORY_FORM_LABEL[
                key as keyof typeof POST_CATEGORY_FORM_LABEL
              ] ?? value}
            </option>
          ))}
        </Select>

        <Input
          label="제목"
          type="text"
          placeholder="제목을 입력해주세요"
          disabled={isUploading}
          {...register("title")}
          errors={[errors.title?.message ?? ""]}
        />

        <PostEditorBlocksField
          editorBlocks={editorBlocks}
          imageBlockAssets={imageBlockAssets}
          blockRefs={blockRefs}
          imageInputRefs={imageInputRefs}
          videoState={videoState}
          videoFileName={videoFileName}
          maxImages={maxImages}
          isUploading={isUploading}
          isVideoUploading={isVideoUploading}
          hasVideoBlock={hasVideoBlock}
          isEditorLocked={isEditorLocked}
          descriptionError={errors.description?.message}
          onAddTextBlock={addTextBlock}
          onAddImageBlock={addImageBlock}
          onAddVideoBlock={addVideoBlock}
          onAddEmbedBlock={addEmbedBlock}
          onMoveBlock={moveBlock}
          onRemoveBlock={removeEditorBlock}
          onUpdateTextBlock={updateTextBlock}
          onUpdateEmbedBlock={updateEmbedBlock}
          onDragEnd={handleDragEnd}
          onVideoDrop={handleVideoDrop}
          onVideoChange={handleVideoChange}
          onClearVideo={clearVideo}
          onImageBlockDrop={handleImageBlockDrop}
          onImageBlockChange={handleImageBlockChange}
          onRemoveImageBlockAsset={removeImageBlockAsset}
        />

        <TagInput
          name="tags"
          control={control}
          maxTags={5}
          resetSignal={resetSignal}
          disabled={isUploading}
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
                  disabled={isUploading}
                >
                  변경
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue("location", null, { shouldDirty: true })
                  }
                  className="text-muted hover:text-danger p-1"
                  disabled={isUploading}
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
              disabled={isUploading}
            >
              <MapPinIcon className="size-5" />
              <span className="text-sm">지도에서 위치 찾기</span>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2.5 pt-3 sm:gap-3 sm:pt-4">
          <Button
            text={
              isUploading
                ? isEdit
                  ? "수정 중..."
                  : "업로드 중..."
                : submitLabel
            }
            disabled={isEditorLocked}
          />

          {isVideoUploading && (
            <p className="px-1 text-xs text-muted">
              동영상은 업로드/처리 중이어도 먼저 저장할 수 있으며, 상세에서 처리
              상태가 안내됩니다.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="h-12 rounded-xl font-medium text-sm border border-border bg-surface text-muted hover:bg-surface-dim transition-colors"
              disabled={isEditorLocked}
            >
              {isEdit ? "원래 값으로 되돌리기" : "전체 초기화"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isEdit && editFlow === "detail-edit") {
                  returnToDetailEditOrigin();
                  return;
                }
                router.push(backUrl);
              }}
              className="flex items-center justify-center h-12 rounded-xl font-medium text-sm border border-border bg-surface text-muted hover:bg-surface-dim transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isUploading}
            >
              취소
            </button>
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
