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
 * 2026.04.05  임도헌   Modified  게시글 detail-edit 저장/취소는 back 복귀 + 1회 refresh/상단 스크롤로 정리해 중복 히스토리와 스크롤 전파 문제를 함께 보정
 * 2026.04.14  임도헌   Modified  지도 선택 모달을 지연 로드하고 mode 기반 내부 서버 액션 선택으로 작성 페이지 초기 번들 부담을 완화
 * 2026.04.21  임도헌   Modified  메타/위치/하단 액션 섹션을 분리하고 주요 함수 설명 주석을 보강
 * 2026.04.24  임도헌   Modified  detail-edit 저장 back 복귀는 명시적 내부 returnTo 문맥과 히스토리가 모두 있을 때만 허용하도록 보강
 * 2026.04.24  임도헌   Modified  navigation refresh helper 기준으로 detail-edit 복귀 플래그 기록 중복을 정리
 * 2026.05.03  임도헌   Modified  게시글 작성/수정 폼에 보드게임 카탈로그 연결 필드 추가
 * 2026.05.04  임도헌   Modified  보드게임 연결 필드를 카테고리 다음으로 올려 게시글 주제 맥락을 먼저 선택하도록 정리
 * 2026.05.05  임도헌   Modified  게시글 편집기/위치/검증 핸들러 JSDoc 보강
 * 2026.05.26  임도헌   Modified  저장 성공 후 queryFn 없는 상세 하위 query를 건드리지 않도록 목록 query만 무효화
 * 2026.05.30  임도헌   Modified  모바일 게시글 폼의 섹션 간격을 작성형 compact 밀도 기준으로 조정
 * 2026.08.22  임도헌   Modified  게시글 전용 업로드 용도와 서버가 반환한 MediaAsset delivery URL 사용
 * 2026.08.27  임도헌   Modified  모션 축소 설정에 따라 편집기 블록 스크롤 동작 조정
 */
"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { DropResult } from "@hello-pangea/dnd";
import TagInput from "@/components/ui/TagInput";
import FormErrorSummary from "@/components/ui/FormErrorSummary";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { getMotionSafeScrollBehavior } from "@/lib/accessibility";
import { postFormSchema, PostFormValues } from "@/features/post/schemas";
import PostEditorBlocksField from "@/features/post/components/PostEditorBlocksField";
import { createPostAction } from "@/features/post/actions/create";
import { updatePostAction } from "@/features/post/actions/update";
import type {
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
  canUseBrowserBack,
  markNavigationRefresh,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";
import PostMetaSection from "@/features/post/components/PostMetaSection";
import PostLocationSection from "@/features/post/components/PostLocationSection";
import PostFormActions from "@/features/post/components/PostFormActions";
import BoardGameRelationField from "@/features/boardgame/components/BoardGameRelationField";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

interface PostFormProps {
  mode: "create" | "edit";
  initialValues?: PostFormValues & { id?: number };
  initialVideo?: PostVideo | null;
  initialBlocks?: PostBlock[];
  backUrl: string;
  boardGameOptions?: BoardGameRelationOption[];
  submitLabel?: string;
  editFlow?: string;
}

const CF_HASH = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
const LazyLocationPicker = dynamic(
  () => import("@/features/map/components/LocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
        <div className="bg-surface flex h-[100dvh] w-full flex-col items-center justify-center gap-4 border-0 p-8 sm:h-auto sm:max-w-md sm:rounded-3xl sm:border sm:border-border-subtle">
          <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-primary">
            지도를 불러오는 중입니다...
          </p>
        </div>
      </div>
    ),
  }
);

/**
 * 게시글 작성/수정 폼
 *
 * [상태 주입 및 상호작용 로직]
 * - `useForm` 기반 폼 상태 관리 및 Zod 스키마 연동 유효성 검증 적용
 * - 블록/미디어 상태 관리와 제출용 FormData 조립을 담당
 * - 블록 렌더링 UI는 `PostEditorBlocksField`, 순수 초기화 헬퍼는 `utils/editor`로 분리
 * - 카테고리, 태그, 지도 기반 위치(Location) 데이터 매핑 기능 제공
 * - FormErrorSummary, applyFieldErrors, focusFirstFieldError 기반의 검증 UX 적용
 * - 폼 제출 시 mode에 맞는 내부 서버 액션을 선택하고 결과에 따른 back/replace 복귀를 처리
 *
 * @param {PostFormProps} props - 초기값, 모드, 복귀 경로, 상세 수정 플로우 설정
 */
export default function PostForm({
  mode,
  initialValues,
  initialVideo,
  initialBlocks,
  backUrl,
  boardGameOptions = [],
  submitLabel = "작성 완료",
  editFlow,
}: PostFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 쿼리 클라이언트 인스턴스 가져오기
  const queryClient = useQueryClient();
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rawReturnTo = searchParams.get("returnTo");
  // 게시글 detail-edit 저장은 명시적 내부 returnTo 문맥이 있는 경우에만 back 허용
  const canResumeDetailEditHistory =
    editFlow === "detail-edit" && !!rawReturnTo && canUseBrowserBack();

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
        boardGameIds: [],
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
  const isEdit = mode === "edit";
  // create/edit 공개 props에는 직렬화 가능한 값만 두고, 서버 액션은 mode로 내부 선택
  const action = mode === "create" ? createPostAction : updatePostAction;

  /**
   * 상세 편집 저장/취소 후 안전한 상세 문맥으로 복귀
   *
   * 명시적 내부 returnTo와 브라우저 히스토리가 함께 있을 때만 back을 재사용하고,
   * 직접 진입처럼 문맥이 불명확한 경우 안전한 상세 URL로 replace
   */
  const returnToDetailEditOrigin = () => {
    if (canResumeDetailEditHistory) {
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
          behavior: getMotionSafeScrollBehavior(),
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

  /**
   * 게시글 폼을 초기값으로 복원
   *
   * RHF 값뿐 아니라 블록 편집기, 이미지 블록 asset, 동영상 draft 상태를 함께 복원
   */
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
  const selectedBoardGameIds = watch("boardGameIds") ?? [];

  /**
   * 지도에서 선택한 위치를 게시글 위치 값으로 반영
   *
   * @param data - 지도 선택 위치 데이터
   */
  const handleLocationSelect = (data: LocationData) => {
    setValue("location", data, { shouldDirty: true });
    setIsMapOpen(false);
  };

  /**
   * 이미지 블록 추가 후 새 블록 위치로 스크롤
   *
   * 긴 글에서도 방금 추가한 이미지 슬롯을 바로 채울 수 있도록 이동 보조
   */
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
        behavior: getMotionSafeScrollBehavior(),
        block: "center",
      });
    });
  };

  /**
   * 텍스트 블록 추가 후 새 블록 위치로 스크롤
   */
  const addTextBlock = () => {
    if (isEditorLocked) return;

    const nextBlock = createTextEditorBlock();
    setEditorBlocks((prev) => [...prev, nextBlock]);
    requestAnimationFrame(() => {
      blockRefs.current[nextBlock.id]?.scrollIntoView({
        behavior: getMotionSafeScrollBehavior(),
        block: "center",
      });
    });
  };

  /**
   * 동영상 블록 추가
   *
   * 게시글당 동영상은 1개만 허용하므로 기존 VIDEO 블록이 있으면 추가 차단
   */
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
        behavior: getMotionSafeScrollBehavior(),
        block: "center",
      });
    });
  };

  /**
   * YouTube URL 입력용 임베드 블록 추가
   */
  const addEmbedBlock = () => {
    if (isEditorLocked) return;

    const nextBlock = createEmbedEditorBlock();
    setEditorBlocks((prev) => [...prev, nextBlock]);
    requestAnimationFrame(() => {
      blockRefs.current[nextBlock.id]?.scrollIntoView({
        behavior: getMotionSafeScrollBehavior(),
        block: "center",
      });
    });
  };

  /**
   * 특정 텍스트 블록의 내용 갱신
   *
   * @param id - 수정할 editor block id
   * @param value - 새 텍스트 내용
   */
  const updateTextBlock = (id: string, value: string) => {
    if (isEditorLocked) return;

    setEditorBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, textContent: value } : block
      )
    );
  };

  /**
   * 특정 임베드 블록의 URL 값 갱신
   *
   * @param id - 수정할 editor block id
   * @param value - 새 embed URL
   */
  const updateEmbedBlock = (id: string, value: string) => {
    if (isEditorLocked) return;

    setEditorBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, embedUrl: value } : block
      )
    );
  };

  /**
   * 버튼 클릭으로 editor block 순서를 한 칸 이동
   *
   * @param index - 현재 block index
   * @param direction - 이동 방향, -1은 위/왼쪽, 1은 아래/오른쪽
   */
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

  /**
   * drag and drop 결과를 editor block 순서에 반영
   *
   * @param result - react-beautiful-dnd drag 종료 결과
   */
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

  /**
   * editor block 제거와 연결된 미디어 draft 상태 정리
   *
   * @param index - 제거할 block index
   */
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

  /**
   * 파일 input으로 선택한 동영상을 draft 업로드 훅으로 전달
   *
   * @param event - 동영상 file input change 이벤트
   */
  const handleVideoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await handleVideoFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  /**
   * 드래그한 동영상 파일을 draft 업로드 훅으로 전달
   *
   * @param event - 동영상 drop 이벤트
   */
  const handleVideoDrop = async (
    event: React.DragEvent<HTMLDivElement | HTMLButtonElement>
  ) => {
    event.preventDefault();
    await handleVideoFiles(Array.from(event.dataTransfer.files ?? []));
  };

  /**
   * 폼 유효성 검사를 통과한 뒤 실제 저장을 수행
   * - 블록 편집기 결과를 최종 본문/미디어 배열로 정규화한 뒤 서버 액션으로 전송
   */
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

          const res = await getUploadUrl("POST_IMAGE");
          if (!res.success) {
            throw new Error(res.error || "Failed to get upload URL");
          }

          const { uploadURL, deliveryUrl } = res.result;
          const cloudflareForm = new FormData();
          cloudflareForm.append("file", asset.file);

          const response = await fetch(uploadURL, {
            method: "POST",
            body: cloudflareForm,
          });

          if (!response.ok) throw new Error("Failed to upload image");
          allPhotoUrls.push(deliveryUrl);
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
      formData.append("boardGameIds", JSON.stringify(data.boardGameIds || []));
      formData.append("blocksJson", JSON.stringify(submittedBlocks));

      // [특수 필드 3] 이미지 배열
      allPhotoUrls.forEach((url) => formData.append("photos[]", url));
      formData.append("photosAnimated", JSON.stringify(allPhotoAnimatedFlags));

      // [일반 필드] 자동 매핑
      const skipFields = [
        "id",
        "location",
        "tags",
        "boardGameIds",
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
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
        toast.success(
          isEdit ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다."
        );
        const nextHref =
          isEdit && backUrl
            ? `/posts/${result.postId}?returnTo=${encodeURIComponent(backUrl)}`
            : `/posts/${result.postId}`;

        if (isEdit && editFlow === "detail-edit") {
          // 상세 진입 편집 복귀
          // back 복귀 직후 상세가 1회 최신화/상단 스크롤을 수행하도록 세션 플래그 기록
          markNavigationRefresh(
            NAVIGATION_REFRESH_SCOPES.POST_DETAIL,
            result.postId
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

  /**
   * 유효성 오류 발생 시 첫 번째 오류 필드로 포커스 이동
   *
   * @param formErrors - React Hook Form 오류 객체
   */
  const onInvalid = (formErrors: typeof errors) => {
    focusFirstFieldError<PostFormValues>(formErrors, setFocus);
  };

  return (
    <div className="bg-background">
      <form
        onSubmit={handleSubmit(onValid, onInvalid)}
        className="flex flex-col gap-4 px-5 py-7 sm:gap-form-gap sm:px-page-x sm:py-page-y"
        noValidate
      >
        <FormErrorSummary errors={errors} />
        <input type="hidden" {...register("description")} />

        <PostMetaSection
          isUploading={isUploading}
          categoryRegister={register("category")}
          categoryErrorMessage={errors.category?.message}
          titleRegister={register("title")}
          titleErrorMessage={errors.title?.message}
        >
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
        </PostMetaSection>

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
        <PostLocationSection
          location={location ?? null}
          isUploading={isUploading}
          onOpenMap={() => setIsMapOpen(true)}
          onClearLocation={() =>
            setValue("location", null, { shouldDirty: true })
          }
        />

        <PostFormActions
          isUploading={isUploading}
          isEdit={isEdit}
          isEditorLocked={isEditorLocked}
          isVideoUploading={isVideoUploading}
          submitLabel={submitLabel}
          onReset={resetForm}
          onCancel={() => {
            if (isEdit && editFlow === "detail-edit") {
              returnToDetailEditOrigin();
              return;
            }
            router.push(backUrl);
          }}
        />
      </form>
      {/*  지도 모달 */}
      {isMapOpen && (
        <LazyLocationPicker
          onClose={() => setIsMapOpen(false)}
          onSelect={handleLocationSelect}
          initialData={location ?? undefined}
        />
      )}
    </div>
  );
}
