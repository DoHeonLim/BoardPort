/**
 * File Name : lib/constants.ts
 * Description : 상수 파일
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  패스워드 관련 상수 추가
 * 2024.10.17  임도헌   Modified  이미지 최대 크기 상수 추가
 * 2024.12.10  임도헌   Modified  이미지 스켈레톤 상수 추가
 * 2025.04.13  임도헌   Modified  제품 관련 상수 추가
 * 2025.05.22  임도헌   Modified  스트리밍 접근 제어 상수 추가
 * 2026.01.20  임도헌   Modified  인증 관련 에러 메시지 상수화
 * 2026.01.24  임도헌   Modified  도메인별 상수(AUTH, PRODUCT 등)를 각 Feature로 이관
 */

// 패스워드 설정 (Auth/User 공용 - 여러 도메인에 걸쳐있어 Global 유지)
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = new RegExp(
  /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).+$/
);
export const PASSWORD_REGEX_ERROR =
  "비밀번호는 소문자, 대문자, 숫자, 특수문자를 포함해야 합니다.";

// 이미지 최대 크기 (Global Utils에서 사용)
export const MAX_PHOTO_SIZE = 3 * 1024 * 1024;
export const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO8UA8AAiUBUcc3qzwAAAAASUVORK5CYII=";

// 유저 키워드 최대 갯수
export const MAX_KEYWORD_PER_USER = 10;

// 페이지네이션 (Global Config)
export const POSTS_PAGE_TAKE = 10;
export const PRODUCTS_PAGE_TAKE = 10;
export const STREAMS_PAGE_TAKE = 12;
