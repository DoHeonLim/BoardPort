/**
 * File Name : features/auth/components/background/Waves.tsx
 * Description : 파도 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  파도 컴포넌트 추가
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.04.12  임도헌   Modified  장식용 파도 영역을 aria-hidden 처리해 landmark/탐색 노이즈를 줄임
 * 2026.04.12  임도헌   Modified  데스크톱 셸에서 파도 하단 여백이 비어 보이지 않도록 위치를 소폭 하향 조정
 * 2026.04.12  임도헌   Modified  모바일에서 파도 시작점이 너무 낮아 보이지 않도록 위치를 소폭 상향 조정
 */

import mainPageStyles from "@/features/auth/components/mainPage.module.css";

export default function Waves() {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-2 left-0 right-0 z-10 sm:-bottom-4"
    >
      <div className={`${mainPageStyles.wave} ${mainPageStyles.wave1}`}></div>
      <div className={`${mainPageStyles.wave} ${mainPageStyles.wave2}`}></div>
      <div className={`${mainPageStyles.wave} ${mainPageStyles.wave3}`}></div>
    </div>
  );
}
