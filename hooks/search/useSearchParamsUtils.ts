/**
 * File Name : hooks/search/useSearchParamsUtils.ts
 * Description : 검색 파라미터 조작 공통 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.17  임도헌   Created   검색 keyword 및 필터 파라미터 조작용 공통 훅 구현
 * 2025.06.18  임도헌   Modified  removeParams 기능 추가(price에서 사용)
 * 2026.01.16  임도헌   Moved     hooks -> hooks/search
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * useSearchParamsUtils
 * 검색 파라미터(keyword, category, price 등)를 조작하고 라우팅을 수행하는 커스텀 훅
 *
 * 기능:
 * - URLSearchParams를 이용해 쿼리스트링을 추가/삭제/수정
 * - 라우팅 후 페이지 refresh 처리
 */
export function useSearchParamsUtils() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * keyword 검색어를 갱신하고 라우팅
   * @param keyword - 검색어 문자열
   */
  const updateKeyword = useCallback(
    (keyword: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("keyword", keyword);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    },
    [searchParams, pathname, router]
  );

  /**
   * 특정 쿼리 파라미터를 추가 또는 수정
   * @param key - 파라미터 이름
   * @param value - 설정할 값
   */
  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    },
    [searchParams, pathname, router]
  );

  /**
   * 특정 쿼리 파라미터를 삭제
   * @param key - 삭제할 파라미터 이름
   */
  const removeParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    },
    [searchParams, pathname, router]
  );

  /**
   * 특정 쿼리 파라미터들을 삭제
   * @param keys - 삭제할 파라미터들들 이름
   */
  const removeParams = (...keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  /**
   * 여러 필터를 한 번에 설정하고 라우팅
   * 기존 쿼리를 유지하지 않고 완전히 덮어씀
   * @param values - 필터 key-value 객체
   */
  const buildSearchParams = useCallback(
    (values: Record<string, string>) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(values)) {
        if (value) {
          params.set(key, value);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    },
    [pathname, router]
  );

  return {
    updateKeyword,
    setParam,
    removeParam,
    removeParams,
    buildSearchParams,
  };
}
