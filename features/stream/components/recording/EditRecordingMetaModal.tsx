/**
 * File Name : features/stream/components/recording/EditRecordingMetaModal.tsx
 * Description : 녹화본 전용 제목·사용자 썸네일 수정 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   녹화본 제목과 사용자 썸네일 교체·제거 기능 추가
 * 2026.09.13  임도헌   Modified  저장 CTA를 공통 비동기 버튼으로 통일
 * 2026.09.13  임도헌   Modified  모달 닫기 버튼의 공용 컴포넌트 적용
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BottomSheet from "@/components/global/BottomSheet";
import ModalCloseButton from "@/components/global/ModalCloseButton";
import ImageUploader from "@/components/global/ImageUploader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { updateRecordingMetaAction } from "@/features/stream/actions/update";
import type { RecordingMetaUpdatePayload } from "@/features/stream/types";
import { toStreamThumbnailPublicUrl } from "@/features/stream/utils/image";
import { getUploadUrl } from "@/lib/cloudflareImages";
import { MAX_PHOTO_SIZE, MAX_PHOTO_SIZE_MB } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalFocus } from "@/hooks/useModalFocus";

interface EditRecordingMetaModalProps {
  open: boolean;
  vodId: number;
  initialTitle: string;
  initialThumbnail?: string | null;
  onClose: () => void;
  onSaved: (next: RecordingMetaUpdatePayload) => void;
}

/** 사용자 지정 녹화본 표시 정보 변경 및 provider 자동 썸네일 보존 */
export default function EditRecordingMetaModal({
  open,
  vodId,
  initialTitle,
  initialThumbnail,
  onClose,
  onSaved,
}: EditRecordingMetaModalProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailChanged, setThumbnailChanged] = useState(false);
  const [isImageFormOpen, setIsImageFormOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setThumbnailPreview(toStreamThumbnailPublicUrl(initialThumbnail));
    setThumbnailFile(null);
    setThumbnailChanged(false);
    setIsImageFormOpen(true);
    setFieldErrors({});
  }, [initialThumbnail, initialTitle, open]);

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
      toast.error("다시보기 썸네일은 1장만 선택할 수 있습니다.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (file) selectThumbnail(file);
    event.target.value = "";
  };

  const handleImageDrop = (event: React.DragEvent) => {
    if ((event.dataTransfer.files?.length ?? 0) > 1) {
      toast.error("다시보기 썸네일은 1장만 선택할 수 있습니다.");
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
          Parameters<typeof updateRecordingMetaAction>[1],
          "thumbnail" | "thumbnailAnimated"
        > = {};

        if (thumbnailChanged) {
          let thumbnail: string | null = null;
          let thumbnailAnimated = false;

          if (thumbnailFile) {
            const upload = await getUploadUrl("VOD_THUMBNAIL");
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

        const result = await updateRecordingMetaAction(vodId, {
          title,
          ...thumbnailUpdate,
        });
        if (!result.success) {
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          toast.error(result.error);
          return;
        }

        onSaved({
          title: result.data.title,
          thumbnail: result.data.thumbnail,
          thumbnailAnimated: result.data.thumbnailAnimated,
        });
        toast.success("다시보기 정보가 업데이트되었습니다.");
        onClose();
        router.refresh();
      } catch (error) {
        console.error("[EditRecordingMetaModal] update failed:", error);
        toast.error(
          "다시보기 정보 수정 중 문제가 발생했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
        );
      }
    });
  };

  const content = (
    <div className="flex flex-col gap-4 pt-2">
      <Input
        label="다시보기 제목"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="다시보기 제목을 입력하세요"
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
          별도 이미지를 등록하지 않으면 Cloudflare 자동 썸네일을 사용합니다. 새
          이미지는 10MB까지 첨부할 수 있습니다.
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end">
      <Button
        type="button"
        onClick={handleSubmit}
        text="저장"
        loading={isPending}
        loadingText="저장 중..."
        disabled={isPending}
        className="h-10 w-full px-5 text-sm sm:w-auto"
      />
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title="다시보기 정보 수정"
        description="이 다시보기의 제목과 사용자 썸네일을 수정할 수 있습니다."
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
        aria-labelledby="edit-recording-meta-title"
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border-subtle bg-surface shadow-2xl",
          "sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <div>
            <h2
              id="edit-recording-meta-title"
              className="text-lg font-bold text-primary"
            >
              다시보기 정보 수정
            </h2>
            <p className="mt-1 text-sm text-muted">
              이 다시보기의 제목과 사용자 썸네일을 수정할 수 있습니다.
            </p>
          </div>
          <ModalCloseButton
            onClick={() => !isPending && onClose()}
            disabled={isPending}
            label="다시보기 정보 수정 모달 닫기"
          />
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
