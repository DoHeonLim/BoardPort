/**
 * File Name : hooks/useIsMobile.ts
 * Description : 모바일 뷰포트 여부 감지 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   window.innerWidth 기반 모바일 여부 판단 훅 추가
 * 2026.02.02  임도헌   Modified  주석 보강
 */
import { useEffect, useState } from "react";

/**
 * 현재 뷰포트 너비가 모바일 기준(breakpoint)보다 작은지 확인합니다.
 *
 * @param breakpoint - 모바일 기준 너비 (기본값: 768px)
 * @returns boolean - 모바일 여부
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile(); // 초기 마운트 시 체크
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}
