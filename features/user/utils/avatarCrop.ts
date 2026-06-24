/**
 * File Name : features/user/utils/avatarCrop.ts
 * Description : 프로필 아바타 크롭 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.09  임도헌   Created   프로필 이미지 크롭 및 리사이즈 유틸 추가
 * 2026.03.12  임도헌   Modified  크롭 미리보기 스타일 계산과 정사각 JPG 출력 흐름 명확화
 */

const CROP_VIEWPORT_SIZE = 320;
const OUTPUT_SIZE = 512;

export type AvatarCropValues = {
  zoom: number;
  offsetXPercent: number;
  offsetYPercent: number;
};

/**
 * 원본 이미지 로드
 *
 * @param src - 원본 이미지 URL
 * @returns {Promise<HTMLImageElement>} 로드된 이미지 요소
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

/**
 * 크롭 결과를 정사각 JPG 파일로 변환
 *
 * @param imageUrl - 원본 이미지 URL
 * @param fileName - 원본 파일명
 * @param crop - 확대/이동 크롭 값
 * @returns {Promise<File>} 크롭된 아바타 파일
 */
export async function createCroppedAvatarFile(
  imageUrl: string,
  fileName: string,
  crop: AvatarCropValues
): Promise<File> {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("이미지 편집을 위한 canvas를 생성하지 못했습니다.");
  }

  const baseScale = Math.max(
    CROP_VIEWPORT_SIZE / image.naturalWidth,
    CROP_VIEWPORT_SIZE / image.naturalHeight
  );
  const finalScale = baseScale * crop.zoom;
  const displayedWidth = image.naturalWidth * finalScale;
  const displayedHeight = image.naturalHeight * finalScale;
  const maxOffsetX = Math.max(0, (displayedWidth - CROP_VIEWPORT_SIZE) / 2);
  const maxOffsetY = Math.max(0, (displayedHeight - CROP_VIEWPORT_SIZE) / 2);
  const offsetX = (crop.offsetXPercent / 100) * maxOffsetX;
  const offsetY = (crop.offsetYPercent / 100) * maxOffsetY;

  const viewportTopLeftX =
    CROP_VIEWPORT_SIZE / 2 - displayedWidth / 2 + offsetX;
  const viewportTopLeftY =
    CROP_VIEWPORT_SIZE / 2 - displayedHeight / 2 + offsetY;

  const sourceX = Math.max(0, (0 - viewportTopLeftX) / finalScale);
  const sourceY = Math.max(0, (0 - viewportTopLeftY) / finalScale);
  const sourceSize = CROP_VIEWPORT_SIZE / finalScale;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );

  if (!blob) {
    throw new Error("이미지 크롭 결과를 만들지 못했습니다.");
  }

  const croppedFileName = fileName.replace(/\.[^.]+$/, "") || "avatar";
  return new File([blob], `${croppedFileName}.jpg`, {
    type: "image/jpeg",
  });
}

/**
 * 크롭 미리보기 스타일 계산
 *
 * @param imageWidth - 원본 이미지 너비
 * @param imageHeight - 원본 이미지 높이
 * @param crop - 확대/이동 크롭 값
 * @returns 미리보기 영역에 적용할 inline style 객체
 */
export function getAvatarCropPreviewStyle(
  imageWidth: number,
  imageHeight: number,
  crop: AvatarCropValues
) {
  const baseScale = Math.max(
    CROP_VIEWPORT_SIZE / imageWidth,
    CROP_VIEWPORT_SIZE / imageHeight
  );
  const finalScale = baseScale * crop.zoom;
  const displayedWidth = imageWidth * finalScale;
  const displayedHeight = imageHeight * finalScale;
  const maxOffsetX = Math.max(0, (displayedWidth - CROP_VIEWPORT_SIZE) / 2);
  const maxOffsetY = Math.max(0, (displayedHeight - CROP_VIEWPORT_SIZE) / 2);
  const offsetX = (crop.offsetXPercent / 100) * maxOffsetX;
  const offsetY = (crop.offsetYPercent / 100) * maxOffsetY;

  return {
    width: `${imageWidth}px`,
    height: `${imageHeight}px`,
    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${finalScale})`,
    transformOrigin: "center center",
  } as const;
}

export const AVATAR_CROP_VIEWPORT_SIZE = CROP_VIEWPORT_SIZE;
