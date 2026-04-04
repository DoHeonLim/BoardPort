/**
 * File Name : features/map/hooks/useKakaoLoader.ts
 * Description : Kakao Maps SDK를 동적으로 로드하는 커스텀 훅 (ID 고정)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.15  임도헌   Created   react-kakao-maps-sdk의 useKakaoLoader 적용
 * 2026.02.15  임도헌   Modified  Script ID 고정으로 중복 로딩 경고 및 라이브러리 누락 방지
 * 2026.03.12  임도헌   Modified  SDK URL을 https로 고정해 localhost 환경의 Tracking Prevention 경고 가능성 완화
 * 2026.04.02  임도헌   Modified  카카오 지도 로더 설정값을 map/constants 공용 상수로 분리
 */

import { useKakaoLoader as useKakaoLoaderOrigin } from "react-kakao-maps-sdk";
import {
  KAKAO_MAP_LIBRARIES,
  KAKAO_MAP_SCRIPT_ID,
  KAKAO_MAP_SDK_URL,
} from "@/features/map/constants";

/**
 * 카카오 지도 SDK를 공통 설정으로 로드하고 상태를 반환하는 훅
 */
export default function useKakaoLoader() {
  const [loading, error] = useKakaoLoaderOrigin({
    /**
     * script id 고정 설정
     * 모달 재오픈 시 중복 로딩 경고 방지와 libraries 적용 스크립트 재사용 목적
     */
    id: KAKAO_MAP_SCRIPT_ID,
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY!,
    libraries: [...KAKAO_MAP_LIBRARIES],
    url: KAKAO_MAP_SDK_URL,
  });

  return { loading, error };
}
