/**
 * File Name : features/map/hooks/useKakaoLoader.ts
 * Description : Kakao Maps SDK를 동적으로 로드하는 커스텀 훅 (ID 고정)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.15  임도헌   Created   react-kakao-maps-sdk의 useKakaoLoader 적용
 * 2026.02.15  임도헌   Modified  Script ID 고정으로 중복 로딩 경고 및 라이브러리 누락 방지
 */

import { useKakaoLoader as useKakaoLoaderOrigin } from "react-kakao-maps-sdk";

export default function useKakaoLoader() {
  const [loading, error] = useKakaoLoaderOrigin({
    /**
     * id를 고정해야 모달 재오픈 시 "외부 요소에 의해 로딩됨" 경고를 방지하고,
     * libraries 파라미터가 정상적으로 적용된 캐시된 스크립트를 재사용합니다.
     */
    id: "kakao-map-script",
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY!,
    libraries: ["services", "clusterer"],
  });

  return { loading, error };
}
