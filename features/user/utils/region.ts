/**
 * File Name : features/user/utils/region.ts
 * Description : 지역 및 범위(Range) 관련 공용 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.20  임도헌   Created   지역 범위 비교 로직(isWithinRegionRange) 및 쿼리 빌더 분리
 * 2026.02.22  임도헌   Modified  위치 미설정 유저 방어(Fallback) 및 특수 행정구역 처리 일치화
 */

import type { RegionRange } from "@/generated/prisma/client";

/**
 * 유저의 동네 설정 범위 안에 특정 지역이 포함되는지 확인
 *
 * - 위치 설정을 하지 않은 신규 유저는 전국(ALL) 매칭으로 처리하여 알림 누락을 방지
 * - 세종시 등 구(region2)가 없는 특수 행정구역의 경우, 'GU(보통)' 범위 선택 시
 *   시(region1) 전체가 아닌 동(region3) 단위로 좁혀서 비교
 * - DB 쿼리 빌더(`buildRegionWhere`) 로직과 일치해야 함
 *
 * @param user - 유저 지역 정보 및 범위 설정
 * @param target - 대상(상품/게시글) 지역 정보
 * @returns 포함 여부
 */
export function isWithinRegionRange(
  user: {
    region1?: string | null;
    region2?: string | null;
    region3?: string | null;
    regionRange: RegionRange;
  },
  target: {
    region1?: string | null;
    region2?: string | null;
    region3?: string | null;
  }
): boolean {
  // 유저가 위치 설정을 하지 않은 경우(신규 유저), 무조건 전국(ALL) 매칭으로 처리
  // 이 가드가 없으면 null === target.region1 비교가 발생하여 알림이 증발
  if (!user.region1) {
    return true;
  }

  // 구 존재 여부 파악 (세종시 등 판별)
  const hasGu = !!user.region2 && user.region2 !== user.region1;

  switch (user.regionRange) {
    case "DONG":
      // 1순위: 동(region3), 2순위: 구(region2)
      if (user.region3) return user.region3 === target.region3;
      return user.region2 === target.region2;

    case "GU":
      if (hasGu) {
        // 일반 도시: '구' 단위 일치
        return user.region2 === target.region2;
      } else {
        // 세종시 등 특수 행정구역: 쿼리 빌더와 동일하게 동->시 순으로 Fallback
        if (user.region3) return user.region3 === target.region3;
        return user.region1 === target.region1;
      }

    case "CITY":
      return user.region1 === target.region1;

    case "ALL":
      return true;

    default:
      return user.region2 === target.region2;
  }
}

/**
 * 유저의 설정 범위에 따른 Prisma Where 조건 생성
 * - 제품 목록, 게시글 목록 조회 시 사용
 * - 세종시 등 구(region2)가 없는 특수 행정구역 대응 강화
 */
export function buildRegionWhere(user: {
  region1?: string | null;
  region2?: string | null;
  region3?: string | null;
  regionRange: RegionRange;
}) {
  // 위치 설정을 아예 하지 않은 신규 유저는 필터 없이 전국 데이터를 띄워줌
  if (!user.region1) {
    return {};
  }

  let condition: any = {};
  const hasGu = !!user.region2 && user.region2 !== user.region1; // 구 존재 여부

  switch (user.regionRange) {
    case "DONG":
      // 1순위: 동(region3), 없으면 구(region2)
      if (user.region3) condition = { region3: user.region3 };
      else if (user.region2) condition = { region2: user.region2 };
      break;

    case "GU":
      if (hasGu) {
        // 일반적인 도시: '구' 단위 필터
        condition = { region2: user.region2 };
      } else {
        // 구가 없는 지역은 '시' 전체 대신 '동'으로 좁혀 보여줌(세종시)
        if (user.region3) condition = { region3: user.region3 };
        else condition = { region1: user.region1 };
      }
      break;

    case "CITY":
      // 시/도 단위는 언제나 region1
      condition = { region1: user.region1 };
      break;

    case "ALL":
      condition = {};
      break;

    default:
      if (user.region2) condition = { region2: user.region2 };
      break;
  }

  return condition;
}
