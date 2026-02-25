/**
 * File Name : features/map/types.ts
 * Description : 지도 및 위치 정보 관련 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.14  임도헌   Created
 */

export interface LocationData {
  latitude: number; // 위도 (y)
  longitude: number; // 경도 (x)
  locationName: string; // 장소명 (사용자가 검색하거나 클릭한 지점의 이름/주소)
  region1: string; // 시/도 (Prisma 저장용)
  region2: string; // 구/군 (Prisma 저장용)
  region3: string; // 동/읍/면 (Prisma 저장용)
  // 유저 동네 범위 (선택 사항)
  regionRange?: "DONG" | "GU" | "CITY" | "ALL";
}
