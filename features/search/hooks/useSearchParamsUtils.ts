/**
 * File Name : features/search/hooks/useSearchParamsUtils.ts
 * Description : 검색 파라미터 조작 공통 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.17  임도헌   Created   검색 keyword 및 필터 파라미터 조작용 공통 훅 구현
 * 2025.06.18  임도헌   Modified  removeParams 기능 추가(price에서 사용)
 * 2026.01.16  임도헌   Moved     hooks -> hooks/search
 * 2026.01.18  임도헌   Moved     hooks/search -> features/search/hooks
 * 2026.01.28  임도헌   Modified  주석 표준화 및 로직 설명 보강
 * 2026.03.07  임도헌   Modified  App Router 검색 파라미터 변경 시 불필요한 router.refresh()를 제거
 * 2026.03.14  임도헌   Modified  검색어는 유지한 채 필터만 적용/초기화할 수 있도록 필터 전용 파라미터 유틸 추가
 * 2026.03.18  임도헌   Modified  검색 파라미터 이동을 공통 헬퍼로 정리하고 빈 쿼리 처리 보강
 * 2026.04.02  임도헌   Modified  검색 필터 키와 필터 값 타입을 search 도메인 공용 파일로 분리
 * 2026.04.17  임도헌   Modified  keyword 유지/필터 교체/빈 쿼리 정리 책임이 훅 설명에서 바로 드러나도록 주석 보강
 */

"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SEARCH_FILTER_KEYS } from "@/features/search/constants";
import type { SearchFilterValues } from "@/features/search/types";

/**
 * 검색/필터 URL 파라미터 조작 공통 훅
 *
 * - 현재 pathname 기준으로 검색 관련 쿼리 이동을 한 곳에서 처리
 * - 빈 쿼리일 때는 불필요한 `?` 없이 경로만 유지
 * - keyword만 갱신하거나, keyword를 유지한 채 필터 계열 파라미터만 교체/초기화하는 흐름을 분리
 */
export function useSearchParamsUtils() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * 검색 쿼리 변경 시 공통 URL 이동
   * - 빈 쿼리일 때 불필요한 `?` 제거
   */
  const pushWithParams = useCallback(
    (params: URLSearchParams) => {
      // 빈 쿼리에서는 경로만 유지해 불필요한 ? 제거
      const nextQuery = params.toString();
      router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router]
  );

  /**
   * 검색어(keyword) 업데이트
   * - 기존 파라미터를 유지한 채 keyword만 변경 또는 삭제
   */
  const updateKeyword = useCallback(
    (keyword: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (keyword) {
        params.set("keyword", keyword);
      } else {
        params.delete("keyword");
      }
      pushWithParams(params);
    },
    [searchParams, pushWithParams]
  );

  /**
   * 특정 파라미터(key) 설정
   */
  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      pushWithParams(params);
    },
    [searchParams, pushWithParams]
  );

  /**
   * 특정 파라미터(key) 삭제
   */
  const removeParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      pushWithParams(params);
    },
    [searchParams, pushWithParams]
  );

  /**
   * 여러 파라미터 일괄 삭제
   */
  const removeParams = (...keys: string[]) => {
    // 전달된 키 기준 일괄 제거
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((key) => params.delete(key));
    pushWithParams(params);
  };

  /**
   * 전체 필터 일괄 적용 (기존 쿼리 덮어쓰기)
   * - 전달받은 값 기준 새 쿼리 재구성
   * - 빈 값 키 자동 제외
   */
  const buildSearchParams = useCallback(
    (values: SearchFilterValues) => {
      const params = new URLSearchParams();
      // 입력값만으로 새 쿼리 재구성
      // 검색 저장/공유 시 현재 필터 상태를 하나의 완성된 URL로 만드는 경로
      for (const [key, value] of Object.entries(values)) {
        if (value) {
          params.set(key, value);
        }
      }
      pushWithParams(params);
    },
    [pushWithParams]
  );

  /**
   * 필터 파라미터만 갱신
   * - 기존 keyword 유지
   * - 전달되지 않은 필터 키 제거
   */
  const applyFilterParams = useCallback(
    (values: SearchFilterValues) => {
      const params = new URLSearchParams(searchParams.toString());
      // 기존 필터 키 초기화
      // keyword는 유지하고 filter 계열 키만 교체하는 경로
      SEARCH_FILTER_KEYS.forEach((key) => params.delete(key));

      // 새 필터 값 반영
      for (const [key, value] of Object.entries(values)) {
        if (value) {
          params.set(key, value);
        }
      }

      pushWithParams(params);
    },
    [searchParams, pushWithParams]
  );

  /**
   * 필터 파라미터만 초기화
   * - 검색어(keyword) 유지
   */
  const resetFilterParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    // 검색어 유지 상태에서 필터만 비우는 초기화 경로
    SEARCH_FILTER_KEYS.forEach((key) => params.delete(key));
    pushWithParams(params);
  }, [searchParams, pushWithParams]);

  return {
    updateKeyword,
    setParam,
    removeParam,
    removeParams,
    buildSearchParams,
    applyFilterParams,
    resetFilterParams,
  };
}
