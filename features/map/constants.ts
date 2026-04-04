/**
 * File Name : features/map/constants.ts
 * Description : 지도 도메인 공용 상수 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   카카오 지도 로더 설정과 기본 중심 좌표를 공용 상수로 분리
 */

/**
 * 지도 초기 진입 시 사용할 기본 중심 좌표
 */
export const MAP_DEFAULT_CENTER: { lat: number; lng: number } = {
  lat: 37.5665,
  lng: 126.978,
};

/**
 * 카카오 지도 SDK 스크립트 요소에 부여할 고정 id
 */
export const KAKAO_MAP_SCRIPT_ID = "kakao-map-script";

/**
 * 지도 도메인에서 공통으로 요구하는 카카오 SDK 라이브러리 목록
 */
export const KAKAO_MAP_LIBRARIES = ["services", "clusterer"] as const;

/**
 * 카카오 지도 SDK 기본 로드 URL
 */
export const KAKAO_MAP_SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";
