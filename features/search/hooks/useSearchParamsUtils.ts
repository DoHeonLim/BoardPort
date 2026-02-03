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
 */

"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * URL Query Parameter 조작 훅
 *
 * [기능]
 * 1. 현재 URL의 쿼리 파라미터를 읽고 수정합니다.
 * 2. `keyword` 등 특정 파라미터만 업데이트하고 라우팅(`push`)합니다.
 * 3. `router.refresh()`를 호출하여 서버 컴포넌트의 데이터 갱신을 유도합니다.
 */
export function useSearchParamsUtils() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * 검색어(keyword) 업데이트
   * - 기존 파라미터를 유지한 채 keyword만 변경하거나 삭제합니다.
   */
  const updateKeyword = useCallback(
    (keyword: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (keyword) {
        params.set("keyword", keyword);
      } else {
        params.delete("keyword");
      }
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    },
    [searchParams, pathname, router]
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
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    },
    [searchParams, pathname, router]
  );

  /**
   * 특정 파라미터(key) 삭제
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
   * 여러 파라미터 일괄 삭제
   */
  const removeParams = (...keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((key) => params.delete(key));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  /**
   * 전체 필터 일괄 적용 (기존 쿼리 덮어쓰기)
   * - 전달받은 객체(values)에 있는 값으로 쿼리를 재구성합니다.
   * - 값이 없는 키는 쿼리에서 제외됩니다.
   */
  const buildSearchParams = useCallback(
    (values: Record<string, string>) => {
      const params = new URLSearchParams();
      // 기존 쿼리를 유지하지 않고, 입력된 values만으로 새로 구성 (초기화 효과)
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
