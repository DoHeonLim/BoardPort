/**
 * File Name : features/chat/utils/optimizeImage.ts
 * Description : 채팅 이미지 업로드용 클라이언트 최적화 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.05  임도헌   Created   채팅 이미지 기본 일반화질 업로드를 위한 리사이즈/압축 유틸 추가
 */
"use client";

export type ChatImageUploadMode = "optimized" | "original";

const CHAT_IMAGE_MAX_DIMENSION = 1600;
const CHAT_IMAGE_QUALITY = 0.82;

/**
 * 채팅 이미지 최적화 대상 여부 판별
 * - GIF/SVG는 원본 유지
 * - 래스터 이미지 계열만 일반화질 최적화 대상으로 취급
 *
 * @param {File} file - 사용자가 선택한 이미지 파일
 * @returns {boolean} 리사이즈/압축 적용 여부
 */
export function canOptimizeChatImage(file: File) {
  if (!file.type.startsWith("image/")) return false;
  if (file.type === "image/gif") return false;
  if (file.type === "image/svg+xml") return false;
  return true;
}

/**
 * 업로드 모드에 맞춰 최종 전송 파일 생성
 *
 * @param {File} file - 사용자가 선택한 원본 파일
 * @param {ChatImageUploadMode} mode - 원본/일반화질 업로드 모드
 * @returns {Promise<File>} 업로드에 사용할 최종 파일
 */
export async function prepareChatImageForUpload(
  file: File,
  mode: ChatImageUploadMode
) {
  if (mode === "original" || !canOptimizeChatImage(file)) {
    return file;
  }

  return optimizeChatImageFile(file);
}

/**
 * 일반화질 채팅 이미지 생성
 * - 긴 변 기준 최대 1600px
 * - JPEG/WebP 품질 0.82
 *
 * @param {File} file - 최적화할 원본 파일
 * @returns {Promise<File>} 리사이즈/압축이 반영된 새 파일
 */
async function optimizeChatImageFile(file: File) {
  const image = await loadImageFromFile(file);
  const nextSize = getResizedDimensions(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = nextSize.width;
  canvas.height = nextSize.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 최적화를 위한 canvas를 생성하지 못했습니다.");
  }

  context.drawImage(image, 0, 0, nextSize.width, nextSize.height);

  const outputType = resolveOutputMimeType(file.type);
  const blob = await canvasToBlob(canvas, outputType, CHAT_IMAGE_QUALITY);

  return new File([blob], replaceFileExtension(file.name, outputType), {
    type: outputType,
    lastModified: file.lastModified,
  });
}

/**
 * File을 브라우저 Image 객체로 디코드
 *
 * @param {File} file - 로드할 이미지 파일
 * @returns {Promise<HTMLImageElement>} 디코드된 이미지 객체
 */
function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 파일을 불러오지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

/**
 * 최대 해상도 기준 리사이즈 결과 계산
 *
 * @param {number} width - 원본 가로 길이
 * @param {number} height - 원본 세로 길이
 * @returns {{ width: number; height: number }} 축소 후 크기
 */
function getResizedDimensions(width: number, height: number) {
  const longestSide = Math.max(width, height);

  if (longestSide <= CHAT_IMAGE_MAX_DIMENSION) {
    return { width, height };
  }

  const scale = CHAT_IMAGE_MAX_DIMENSION / longestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * canvas 결과 포맷 결정
 *
 * @param {string} inputType - 원본 MIME 타입
 * @returns {string} 출력 MIME 타입
 */
function resolveOutputMimeType(inputType: string) {
  if (inputType === "image/webp") return "image/webp";
  if (inputType === "image/png") return "image/webp";
  return "image/jpeg";
}

/**
 * canvas -> Blob 변환
 *
 * @param {HTMLCanvasElement} canvas - 이미지가 그려진 canvas
 * @param {string} mimeType - 출력 포맷
 * @param {number} quality - 압축 품질
 * @returns {Promise<Blob>} 최종 Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("이미지 최적화 결과를 생성하지 못했습니다."));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });
}

/**
 * 최종 업로드 포맷에 맞춘 파일명 정리
 *
 * @param {string} fileName - 원본 파일명
 * @param {string} mimeType - 최종 MIME 타입
 * @returns {string} 확장자가 정리된 파일명
 */
function replaceFileExtension(fileName: string, mimeType: string) {
  const nextExtension = mimeType === "image/webp" ? "webp" : "jpg";
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return `${fileName}.${nextExtension}`;
  }

  return `${fileName.slice(0, dotIndex)}.${nextExtension}`;
}
