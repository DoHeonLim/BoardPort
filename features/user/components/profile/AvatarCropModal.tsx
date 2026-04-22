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
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import Button from "@/components/ui/Button";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import {
  AVATAR_CROP_VIEWPORT_SIZE,
  type AvatarCropValues,
  getAvatarCropPreviewStyle,
} from "@/features/user/utils/avatarCrop";

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

export default function AvatarCropModal({
  open,
  imageUrl,
  onClose,
  onConfirm,
  loading = false,
}: AvatarCropModalProps) {
  const [mounted, setMounted] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [crop, setCrop] = useState<AvatarCropValues>(DEFAULT_CROP);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 오픈 시 배경 스크롤 잠금, ESC 닫기, 첫 포커스 진입을 함께 처리
  useEffect(() => {
    if (!open) return;
    setCrop(DEFAULT_CROP);
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;

    lockBodyScroll();
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
    };
  }, [loading, onClose, open]);

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

  const previewStyle = useMemo(
    () => getAvatarCropPreviewStyle(imageSize.width, imageSize.height, crop),
    [crop, imageSize.height, imageSize.width]
  );

  if (!mounted || !open) return null;

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
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-primary">프로필 이미지 조정</h2>
          <p className="text-sm text-muted">
            확대와 위치를 조절한 뒤 정사각형 아바타로 저장합니다.
          </p>
        </div>

        <div className="mt-5 flex justify-center">
          <div
            className="relative overflow-hidden rounded-full border-4 border-border-subtle bg-surface-dim"
            style={{
              width: AVATAR_CROP_VIEWPORT_SIZE,
              height: AVATAR_CROP_VIEWPORT_SIZE,
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

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary">
              확대
            </span>
            <input
              type="range"
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
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary">
              좌우 위치
            </span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={crop.offsetXPercent}
              onChange={(e) =>
                setCrop((prev) => ({
                  ...prev,
                  offsetXPercent: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-primary">
              상하 위치
            </span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={crop.offsetYPercent}
              onChange={(e) =>
                setCrop((prev) => ({
                  ...prev,
                  offsetYPercent: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </label>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary-modal h-12 text-sm font-medium"
          >
            취소
          </button>
          <Button
            type="button"
            text={loading ? "적용 중..." : "이대로 적용"}
            disabled={loading}
            onClick={() => onConfirm(crop)}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
