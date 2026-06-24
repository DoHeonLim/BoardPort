/**
 * File Name : features/auth/components/background/Clouds.tsx
 * Description : 구름 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.27  임도헌   Created
 * 2025.05.27  임도헌   Modified  구름 컴포넌트 추가
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.04.12  임도헌   Modified  장식용 배경임을 aria-hidden으로 명시해 로그인 전 메인 접근성 노이즈를 축소
 */

import mainPageStyles from "@/features/auth/components/mainPage.module.css";

export default function Clouds() {
  const cloudClass = `${mainPageStyles.cloud} bg-white/80 dark:bg-gray-800/50`;

  return (
    <div
      aria-hidden="true"
      className={`${mainPageStyles.clouds} pointer-events-none`}
    >
      <div className={`${mainPageStyles.cloud1} ${cloudClass}`} />
      <div className={`${mainPageStyles.cloud2} ${cloudClass}`} />
      <div className={`${mainPageStyles.cloud3} ${cloudClass}`} />
    </div>
  );
}
