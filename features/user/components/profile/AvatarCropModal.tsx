/**
 * File Name : features/user/components/profile/AvatarCropModal.tsx
 * Description : 프로필 아바타 크롭 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.09  임도헌   Created   프로필 이미지 확대/이동/크롭 모달 추가
 * 2026.03.12  임도헌   Modified  크롭 미리보기 이미지를 next/image 기준으로 통일
 * 2026.03.22  임도헌   Modified  최근 프로필 모달 톤에 맞춰 외곽선/미리보기 보더 강도 정리
 * 2026.03.28  임도헌   Modified  모바일에서 모달이 우측으로 밀리지 않도록 중앙 정렬과 폭 계산을 flex 기반으로 재정리
 * 2026.04.08  임도헌   Modified  공용 bodyScrollLock과 ESC 닫기, 포커스 진입을 추가해 오버레이 동작 안정화
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.06.19  임도헌   Modified  X 닫기 버튼을 추가하고 푸터 취소 버튼을 제거해 크롭 적용 CTA 위계 정리
 * 2026.06.19  임도헌   Modified  모바일 프로필 이미지 조정 UI를 공용 BottomSheet로 분기해 모달 문법 통일
 * 2026.08.27  임도헌   Modified  데스크톱 포커스 트랩·초기/복귀 포커스를 공용 useModalFocus로 통일
 * 2026.08.28  임도헌   Modified  아바타 크롭 모달 함수 JSDoc 보강
 * 2026.09.06  임도헌   Modified  좌표 슬라이더를 포인터 드래그·방향키 이동으로 전환하고 반응형 크롭 좌표 동기화
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import Button from "@/components/ui/Button";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import {
  AVATAR_CROP_VIEWPORT_SIZE,
  type AvatarCropValues,
  getAvatarCropPreviewStyle,
  moveAvatarCrop,
} from "@/features/user/utils/avatarCrop";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalFocus } from "@/hooks/useModalFocus";

interface AvatarCropModalProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onConfirm: (crop: AvatarCropValues) => void;
  loading?: boolean;
}

const DEFAULT_CROP: AvatarCropValues = {
  zoom: 1,
  offsetXPercent: 0,
  offsetYPercent: 0,
};

/**
 * 아바타 확대·이동 값을 조절하고 원형 미리보기 기준 크롭 설정을 반환한다.
 *
 * @param props - 원본 이미지, 열림 상태와 크롭 완료 콜백
 * @returns 모바일 BottomSheet 또는 데스크톱 크롭 대화상자
 */
export default function AvatarCropModal({
  open,
  imageUrl,
  onClose,
  onConfirm,
  loading = false,
}: AvatarCropModalProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [crop, setCrop] = useState<AvatarCropValues>(DEFAULT_CROP);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [viewportSize, setViewportSize] = useState(AVATAR_CROP_VIEWPORT_SIZE);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달을 다시 열면 이전 크롭 상태를 초기화한다.
  useEffect(() => {
    if (!open) return;
    setCrop(DEFAULT_CROP);
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;
    if (isMobile) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isMobile, open]);

  useModalFocus({
    open,
    enabled: mounted && !isMobile,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    onClose: () => {
      if (!loading) onClose();
    },
  });

  useEffect(() => {
    if (!open || !imageUrl) return;

    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = imageUrl;

    return () => {
      active = false;
    };
  }, [open, imageUrl]);

  useEffect(() => {
    const element = viewport;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setViewportSize(element.clientWidth)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [viewport]);

  const move = (dx: number, dy: number) => {
    if (loading) return;
    setCrop((previous) =>
      moveAvatarCrop(
        imageSize.width,
        imageSize.height,
        previous,
        dx,
        dy,
        viewportSize
      )
    );
  };

  const previewStyle = useMemo(
    () =>
      getAvatarCropPreviewStyle(
        imageSize.width,
        imageSize.height,
        crop,
        viewportSize
      ),
    [crop, imageSize.height, imageSize.width, viewportSize]
  );

  if (!mounted || !open) return null;

  const bodyContent = (
    <>
      <div className="mt-2 flex justify-center sm:mt-5">
        <div
          ref={setViewport}
          tabIndex={loading ? -1 : 0}
          role="group"
          aria-label="프로필 사진 위치 조정"
          aria-describedby="avatar-drag-help"
          data-drag-ignore="true"
          className="focus-ring-strong relative aspect-square w-full max-w-[320px] overflow-hidden rounded-full bg-surface-dim cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => {
            if (loading || !event.isPrimary || event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
          }}
          onPointerMove={(event) => {
            const previous = drag.current;
            if (!previous || previous.id !== event.pointerId) return;
            move(event.clientX - previous.x, event.clientY - previous.y);
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            };
          }}
          onPointerUp={(event) => {
            if (drag.current?.id === event.pointerId) {
              drag.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            const delta: Record<string, [number, number]> = {
              ArrowLeft: [-5, 0],
              ArrowRight: [5, 0],
              ArrowUp: [0, -5],
              ArrowDown: [0, 5],
            };
            if (delta[event.key]) {
              event.preventDefault();
              move(...delta[event.key]);
            }
          }}
          style={{
            touchAction: "none",
          }}
        >
          <NextImage
            src={imageUrl}
            alt="아바타 크롭 미리보기"
            width={imageSize.width}
            height={imageSize.height}
            unoptimized
            className="absolute left-1/2 top-1/2 max-w-none select-none pointer-events-none"
            style={previewStyle}
          />
        </div>
      </div>

      <p id="avatar-drag-help" className="mt-3 text-center text-sm text-muted">
        사진을 드래그하거나 방향키로 위치를 조정하세요
      </p>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-primary">
            확대
          </span>
          <input
            type="range"
            disabled={loading}
            min="1"
            max="2.5"
            step="0.01"
            value={crop.zoom}
            onChange={(e) =>
              setCrop((prev) => ({
                ...prev,
                zoom: Number(e.target.value),
              }))
            }
            className="focus-ring-strong w-full accent-brand dark:accent-brand-light"
          />
        </label>

        <button
          type="button"
          disabled={loading}
          className="focus-ring-soft rounded-lg px-3 py-2 text-sm text-primary"
          onClick={() => setCrop(DEFAULT_CROP)}
        >
          가운데로 초기화
        </button>
      </div>
    </>
  );

  const footer = (
    <div className="flex justify-end">
      <Button
        type="button"
        text={loading ? "적용 중..." : "이대로 적용"}
        disabled={loading}
        className="w-full sm:w-auto sm:min-w-[132px]"
        onClick={() => onConfirm(crop)}
      />
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title="프로필 이미지 조정"
        description="확대와 위치를 조절한 뒤 정사각형 아바타로 저장합니다."
        onClose={() => {
          if (!loading) onClose();
        }}
        contentClassName="pt-4"
        footer={footer}
        panelClassName="max-h-[90dvh]"
      >
        {bodyContent}
      </BottomSheet>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-6 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="프로필 이미지 조정"
        tabIndex={-1}
        className="relative w-full max-w-xl rounded-3xl border border-border-subtle bg-surface p-5 shadow-2xl outline-none sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-primary">
              프로필 이미지 조정
            </h2>
            <p className="text-sm text-muted">
              확대와 위치를 조절한 뒤 정사각형 아바타로 저장합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="프로필 이미지 조정 모달 닫기"
            className="focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:opacity-50"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        {bodyContent}

        <div className="mt-6">{footer}</div>
      </div>
    </div>,
    document.body
  );
}
