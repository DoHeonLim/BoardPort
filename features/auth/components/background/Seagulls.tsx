/**
 * File Name : features/auth/components/background/Seagulls.tsx
 * Description : 갈매기 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  갈매기 컴포넌트 추가
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.04.12  임도헌   Modified  외부 SVG 배경 이미지를 제거하고 transform 기반 경량 갈매기 벡터로 교체
 * 2026.04.12  임도헌   Modified  border 기반 갈매기 형태를 inline SVG 실루엣으로 교체해 시각적 깨짐을 보정
 * 2026.04.12  임도헌   Modified  갈매기 아치와 몸통 실루엣을 다듬어 로그인 전 메인 배경 디테일을 자연스럽게 개선
 */

import mainPageStyles from "@/features/auth/components/mainPage.module.css";

function SeagullMark() {
  return (
    <svg
      viewBox="0 0 72 28"
      className={mainPageStyles.seagullMark}
      focusable="false"
      aria-hidden="true"
    >
      <path
        d="M7 18.8C11.4 15.1 15.5 10.8 20.3 10.1C25.1 9.4 29.2 12.1 33.7 16.4"
        className={mainPageStyles.seagullShadow}
        pathLength="1"
      />
      <path
        d="M38.3 16.4C42.8 12.1 46.9 9.4 51.7 10.1C56.5 10.8 60.6 15.1 65 18.8"
        className={mainPageStyles.seagullShadow}
        pathLength="1"
      />
      <path
        d="M6 17.2C11 13.1 15.2 7.9 20.7 7.2C26.2 6.6 30.4 9.8 35.2 15"
        className={mainPageStyles.seagullStroke}
        pathLength="1"
      />
      <path
        d="M36.8 15C41.6 9.8 45.8 6.6 51.3 7.2C56.8 7.9 61 13.1 66 17.2"
        className={mainPageStyles.seagullStroke}
        pathLength="1"
      />
      <path
        d="M30.5 15.1C32.1 13.7 34 13 36 13C38 13 39.9 13.7 41.5 15.1"
        className={mainPageStyles.seagullBody}
        pathLength="1"
      />
      <path
        d="M33.2 16.1C34.1 15.5 35 15.2 36 15.2C37 15.2 37.9 15.5 38.8 16.1"
        className={`${mainPageStyles.seagullBody} ${mainPageStyles.seagullBodySoft}`}
        pathLength="1"
      />
    </svg>
  );
}

export default function Seagulls() {
  return (
    <div aria-hidden="true" className={mainPageStyles.seagulls}>
      <div className={`${mainPageStyles.seagull} ${mainPageStyles.seagull1}`}>
        <SeagullMark />
      </div>
      <div className={`${mainPageStyles.seagull} ${mainPageStyles.seagull2}`}>
        <SeagullMark />
      </div>
    </div>
  );
}
