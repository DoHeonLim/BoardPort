/**
 * File Name : features/stream/components/EditStreamMetaModal.tsx
 * Description : 방송 제목·설명·사용자 썸네일 수정 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.07  임도헌   Created   방송 상세 상단 메뉴에서 여는 제목/설명 수정 모달 추가
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.06.01  임도헌   Modified  방송 정보 수정 입력 높이를 모바일 작성형 폼 기준으로 정리
 * 2026.06.19  임도헌   Modified  X 닫기와 중복되는 푸터 취소 버튼을 제거해 저장 CTA 중심으로 정리
 * 2026.06.19  임도헌   Modified  모바일 방송 정보 수정 UI를 공용 BottomSheet로 분기해 모달 문법 통일
 * 2026.08.27  임도헌   Modified  데스크톱 포커스 트랩·초기/복귀 포커스를 공용 useModalFocus로 통일
 * 2026.09.08  임도헌   Modified  사용자 썸네일 교체·제거와 Cloudflare direct upload 추가
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XMarkIcon } from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import Input from "@/components/ui/Input";
import ImageUploader from "@/components/global/ImageUploader";
import { updateBroadcastMetaAction } from "@/features/stream/actions/update";
import type { StreamMetaUpdatePayload } from "@/features/stream/types";
import { toStreamThumbnailPublicUrl } from "@/features/stream/utils/image";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { MAX_PHOTO_SIZE, MAX_PHOTO_SIZE_MB } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalFocus } from "@/hooks/useModalFocus";

interface EditStreamMetaModalProps {
  open: boolean;
  streamId: number;
  initialTitle: string;
  initialDescription?: string | null;
  initialThumbnail?: string | null;
  onClose: () => void;
  onSaved: (next: StreamMetaUpdatePayload) => void;
}

/**
 * 방송 표시 정보를 빠르게 수정하는 모달
 *
 * - 모바일은 하단 시트, 데스크톱은 중앙 모달 톤으로 반응형 배치
 * - 제목·설명은 항상 저장하고 썸네일은 실제 교체·제거했을 때만 변경 요청
 * - 저장 성공 시 상세 셸 로컬 상태와 서버 상태를 함께 갱신
 */
export default function EditStreamMetaModal({
  open,
  streamId,
  initialTitle,
  initialDescription,
  initialThumbnail,
  onClose,
  onSaved,
}: EditStreamMetaModalProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailChanged, setThumbnailChanged] = useState(false);
  const [isImageFormOpen, setIsImageFormOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setDescription(initialDescription ?? "");
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setThumbnailPreview(toStreamThumbnailPublicUrl(initialThumbnail));
    setThumbnailFile(null);
    setThumbnailChanged(false);
    setIsImageFormOpen(true);
    setFieldErrors({});
  }, [initialDescription, initialThumbnail, initialTitle, open]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  useModalFocus({
    open,
    enabled: mounted && !isMobile,
    containerRef: dialogRef,
    onClose: () => {
      if (!isPending) onClose();
    },
  });

  if (!open || !mounted) return null;

  const selectThumbnail = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (
      file.type === "image/x-icon" ||
      file.type === "image/vnd.microsoft.icon" ||
      file.name.toLowerCase().endsWith(".ico")
    ) {
      toast.error(".ico 파일은 지원하지 않습니다. (jpg, png, webp 등 사용)");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error(
        `이미지는 최대 ${MAX_PHOTO_SIZE_MB}MB까지 업로드할 수 있습니다.`
      );
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setThumbnailPreview(objectUrl);
    setThumbnailFile(file);
    setThumbnailChanged(true);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if ((event.target.files?.length ?? 0) > 1) {
      toast.error("방송 썸네일은 1장만 선택할 수 있습니다.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (file) selectThumbnail(file);
    event.target.value = "";
  };

  const handleImageDrop = (event: React.DragEvent) => {
    if ((event.dataTransfer.files?.length ?? 0) > 1) {
      toast.error("방송 썸네일은 1장만 선택할 수 있습니다.");
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (file) selectThumbnail(file);
  };

  const handleDeleteImage = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setThumbnailPreview(null);
    setThumbnailFile(null);
    setThumbnailChanged(true);
  };

  const handleSubmit = () => {
    if (isPending) return;

    setFieldErrors({});

    startTransition(async () => {
      try {
        let thumbnailUpdate: Pick<
          Parameters<typeof updateBroadcastMetaAction>[1],
          "thumbnail" | "thumbnailAnimated"
        > = {};

        if (thumbnailChanged) {
          let thumbnail: string | null = null;
          let thumbnailAnimated = false;

          if (thumbnailFile) {
            const upload = await getUploadUrl("STREAM_THUMBNAIL");
            if (!upload.success) {
              toast.error(upload.error ?? "썸네일 업로드 준비에 실패했습니다.");
              return;
            }

            const uploadBody = new FormData();
            uploadBody.append("file", thumbnailFile);
            const response = await fetch(upload.result.uploadURL, {
              method: "POST",
              body: uploadBody,
            });
            if (!response.ok) {
              toast.error("썸네일 업로드에 실패했습니다. 다시 시도해주세요.");
              return;
            }
            thumbnail = upload.result.deliveryUrl;
            thumbnailAnimated = thumbnailFile.type === "image/gif";
          }

          thumbnailUpdate = { thumbnail, thumbnailAnimated };
        }

        const result = await updateBroadcastMetaAction(streamId, {
          title,
          description,
          ...thumbnailUpdate,
        });

        if (!result.success) {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          toast.error(
            result.error ??
              "방송 정보 수정에 실패했습니다. 입력값과 썸네일을 확인한 뒤 다시 시도해주세요."
          );
          return;
        }

        onSaved({
          title: result.data.title,
          description: result.data.description,
          thumbnail: result.data.thumbnail,
          thumbnailAnimated: result.data.thumbnailAnimated,
        });
        toast.success("방송 정보가 업데이트되었습니다.");
        onClose();
        router.refresh();
      } catch (error) {
        console.error("[EditStreamMetaModal] update failed:", error);
        toast.error(
          "방송 정보 수정 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
        );
      }
    });
  };

  const content = (
    <div className="flex flex-col gap-4 pt-2">
      <Input
        label="방송 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="방송 제목을 입력하세요"
        errors={fieldErrors.title ?? []}
        disabled={isPending}
        density="compact"
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-primary">사용자 썸네일</span>
        <ImageUploader
          previews={thumbnailPreview ? [thumbnailPreview] : []}
          onImageChange={handleImageChange}
          onImageDrop={handleImageDrop}
          onDeleteImage={handleDeleteImage}
          onDragEnd={() => undefined}
          isOpen={isImageFormOpen}
          onToggle={() => setIsImageFormOpen((value) => !value)}
          maxImages={1}
          isUploading={isPending}
          compact
          optional
        />
        <p className="px-1 text-xs leading-5 text-muted">
          사용자 썸네일을 제거하면 기본 이미지로 전환됩니다. 새 이미지는
          10MB까지 첨부할 수 있습니다.
        </p>
      </div>
      <Input
        type="textarea"
        label="방송 설명"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="방송 설명을 입력하세요"
        errors={fieldErrors.description ?? []}
        disabled={isPending}
        className="min-h-[120px]"
        density="compact"
      />
    </div>
  );

  const footer = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="btn-primary h-10 w-full px-5 text-sm sm:w-auto"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title="방송 정보 수정"
        description="라이브 중에도 제목과 설명, 사용자 썸네일을 업데이트할 수 있습니다."
        onClose={() => !isPending && onClose()}
        contentClassName="pt-4"
        footer={footer}
      >
        {content}
      </BottomSheet>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={() => !isPending && onClose()}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-stream-meta-title"
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border-subtle bg-surface shadow-2xl",
          "sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <div>
            <h2
              id="edit-stream-meta-title"
              className="text-lg font-bold text-primary"
            >
              방송 정보 수정
            </h2>
            <p className="mt-1 text-sm text-muted">
              라이브 중에도 제목과 설명, 사용자 썸네일을 업데이트할 수
              있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !isPending && onClose()}
            disabled={isPending}
            aria-label="방송 정보 수정 모달 닫기"
            className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{content}</div>

        <div className="shrink-0 border-t border-border-subtle bg-surface px-6 py-4">
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
}
