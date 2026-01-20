/**
 * File Name : hooks/useIsMobile.ts
 * Description : 모바일 뷰포트 여부 감지 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   window.innerWidth 기반 모바일 여부 판단 훅 추가
 */

import { useEffect, useState } from "react";

export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile(); // 초기 체크
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}
