/**
 * File Name : features/map/utils/normalizeRegion.ts
 * Description : 카카오 행정구역 응답을 BoardPort 지역 필터 계층으로 정규화
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.18  임도헌   Created   특별시/광역시는 카카오 1depth를 유지하고 도 단위 주소는 시/군 중심으로 변환
 */

interface KakaoRegionInput {
  region1?: string | null;
  region2?: string | null;
  region3?: string | null;
}

export interface NormalizedRegion {
  region1: string;
  region2: string;
  region3: string;
}

const PROVINCE_REGIONS = new Set([
  "경기",
  "경기도",
  "강원",
  "강원도",
  "충북",
  "충청북도",
  "충남",
  "충청남도",
  "전북",
  "전라북도",
  "전남",
  "전라남도",
  "경북",
  "경상북도",
  "경남",
  "경상남도",
  "제주",
  "제주도",
  "제주특별자치도",
]);

function splitRegion(value?: string | null) {
  return value?.split(/\s+/).filter(Boolean) ?? [];
}

function isProvinceRegion(region1?: string | null) {
  if (!region1) return false;
  return PROVINCE_REGIONS.has(region1) || region1.endsWith("도");
}

export function normalizeKakaoRegion({
  region1,
  region2,
  region3,
}: KakaoRegionInput): NormalizedRegion {
  const fallbackRegion1 = region1 ?? "";
  const fallbackRegion2 = region2 || fallbackRegion1;
  const fallbackRegion3 = region3 ?? "";

  if (!isProvinceRegion(region1)) {
    // 서울/부산/대전 등 특별시·광역시는 카카오 1depth 값을 그대로 필터 기준으로 사용한다.
    return {
      region1: fallbackRegion1,
      region2: fallbackRegion2,
      region3: fallbackRegion3,
    };
  }

  const parts = [...splitRegion(region2), ...splitRegion(region3)];
  const cityIndex = parts.findIndex(
    (part) => part.endsWith("시") || part.endsWith("군")
  );

  if (cityIndex < 0) {
    return {
      region1: fallbackRegion1,
      region2: fallbackRegion2,
      region3: fallbackRegion3,
    };
  }

  const cityName = parts[cityIndex];
  const [, ...rest] = parts.slice(cityIndex);

  if (rest.length === 1 && !rest[0].endsWith("구")) {
    // 거제시 고현동처럼 구가 없는 시/군은 기존 세종시 처리와 맞춰 region2를 region1로 둔다.
    return {
      region1: cityName,
      region2: cityName,
      region3: rest[0],
    };
  }

  return {
    region1: cityName,
    region2: rest[0] ?? cityName,
    region3: rest[1] ?? "",
  };
}

export function formatNormalizedRegion(region: KakaoRegionInput) {
  return [
    region.region1,
    region.region2 && region.region2 !== region.region1 ? region.region2 : null,
    region.region3,
  ]
    .filter(Boolean)
    .join(" ");
}
