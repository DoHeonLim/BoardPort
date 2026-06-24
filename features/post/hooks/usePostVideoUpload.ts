/**
 * File Name : features/post/hooks/usePostVideoUpload.ts
 * Description : 게시글 작성/수정 폼에서 사용하는 동영상 업로드 상태 관리 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.31  임도헌   Created   PostForm의 Cloudflare Stream draft 업로드 로직과 상태 관리를 분리
 * 2026.03.31  임도헌   Modified  초기 video 복원, draftKey reset, direct upload 시작 흐름 설명 보강
 * 2026.04.02  임도헌   Modified  훅 반환/옵션 JSDoc 태그 형식 정리
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import {
  createPostVideoUploadSessionAction,
  markPostVideoDraftFailedAction,
  removePostVideoDraftAction,
} from "@/features/post/actions/video";
import type { PostVideo } from "@/features/post/types";
import type { PostFormValues } from "@/features/post/schemas";

interface UsePostVideoUploadOptions {
  initialVideo?: PostVideo | null;
  setValue: UseFormSetValue<PostFormValues>;
}

/**
 * 게시글 폼에서 동영상 초안 업로드와 연결 필드를 관리합니다.
 * 동영상 업로드는 파일 선택 즉시 시작하고, 게시글 저장 시 `draftKey`를 연결하는 구조를 사용합니다.
 *
 * @param {UsePostVideoUploadOptions} options - 초기 동영상 메타와 RHF setValue 핸들러
 * @returns {object} 업로드 상태, 현재 동영상 상태, draft 제어 핸들러 묶음
 */
export function usePostVideoUpload({
  initialVideo,
  setValue,
}: UsePostVideoUploadOptions) {
  // 업로드 응답 경합 방지
  // 제거/재선택 이후 늦게 도착한 이전 업로드 완료값 무시 목적
  const uploadTokenRef = useRef(0);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<PostVideo | null>(
    initialVideo ?? null
  );
  const latestVideoStateRef = useRef<PostVideo | null>(initialVideo ?? null);

  // 수정 모드 초기 video 또는 reset 이후의 복원 상태
  useEffect(() => {
    setVideoState(initialVideo ?? null);
    setVideoFileName(null);
  }, [initialVideo]);

  useEffect(() => {
    latestVideoStateRef.current = videoState;
  }, [videoState]);

  // 화면 이탈 시 미연결 draft 정리
  // clearVideo를 누르지 않고 뒤로 가기/새로고침한 경우를 위한 best-effort cleanup
  useEffect(() => {
    return () => {
      const latestVideo = latestVideoStateRef.current;
      const draftKey = latestVideo?.draftKey;
      const uploadUid = latestVideo?.uploadUid ?? latestVideo?.providerAssetId;

      if (!draftKey && !uploadUid) return;

      void removePostVideoDraftAction({
        draftKey,
        uploadUid,
      });
    };
  }, []);

  // 동영상 draft 해제
  const clearVideo = () => {
    const currentDraftKey = videoState?.draftKey;
    const currentUploadUid = videoState?.uploadUid ?? videoState?.providerAssetId;
    uploadTokenRef.current += 1;
    setValue("videoDraftKey", null, { shouldDirty: true });
    setValue("removeVideo", true, { shouldDirty: true });
    setVideoState(null);
    setVideoFileName(null);
    setIsVideoUploading(false);

    if (currentDraftKey || currentUploadUid) {
      void removePostVideoDraftAction({
        draftKey: currentDraftKey,
        uploadUid: currentUploadUid,
      });
    }
  };

  // 초기 video 상태 복원
  const resetVideo = (nextVideo?: PostVideo | null) => {
    uploadTokenRef.current += 1;
    setVideoState(nextVideo ?? null);
    setVideoFileName(null);
    setIsVideoUploading(false);
  };

  // direct upload 시작
  const handleVideoFiles = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    if (!file) return;

    // 가장 최근 업로드 요청만 유효하게 취급
    const uploadToken = ++uploadTokenRef.current;
    let createdDraft:
      | {
          draftKey: string;
          uploadUid: string;
        }
      | null = null;
    setIsVideoUploading(true);

    try {
      const session = await createPostVideoUploadSessionAction({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });

      if (!session.success) {
        if (uploadToken === uploadTokenRef.current) {
          toast.error(session.error);
        }
        return;
      }

      if (uploadToken !== uploadTokenRef.current) return;

      // 업로드 시작 직후 draft 연결
      // 게시글 저장은 먼저 허용하고 상세에서 PROCESSING 상태를 안내하는 흐름
      createdDraft = {
        draftKey: session.data.draftKey,
        uploadUid: session.data.uploadUid,
      };
      setValue("videoDraftKey", session.data.draftKey, { shouldDirty: true });
      setValue("removeVideo", false, { shouldDirty: true });
      setVideoState({
        provider: "CLOUDFLARE_STREAM",
        providerAssetId: session.data.uploadUid,
        uploadUid: session.data.uploadUid,
        draftKey: session.data.draftKey,
        status: "PROCESSING",
      });
      setVideoFileName(file.name);

      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const response = await fetch(session.data.uploadUrl, {
        method: "POST",
        body: uploadForm,
      });

      if (!response.ok) {
        throw new Error("Cloudflare Stream upload failed");
      }

      if (uploadToken !== uploadTokenRef.current) return;
      toast.success(
        "동영상 업로드를 시작했습니다. 처리 완료까지 잠시만 기다려주세요."
      );
    } catch (error) {
      console.error("[usePostVideoUpload] video upload error:", error);
      if (uploadToken === uploadTokenRef.current) {
        void markPostVideoDraftFailedAction({
          draftKey: createdDraft?.draftKey,
          uploadUid: createdDraft?.uploadUid,
        });
        setVideoState((prev) =>
          prev
            ? {
                ...prev,
                status: "FAILED",
              }
            : prev
        );
      }
      if (uploadToken === uploadTokenRef.current) {
        toast.error("동영상 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      if (uploadToken === uploadTokenRef.current) {
        setIsVideoUploading(false);
      }
    }
  };

  return {
    isVideoUploading,
    videoFileName,
    videoState,
    clearVideo,
    resetVideo,
    handleVideoFiles,
  };
}
