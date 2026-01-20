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
 */

export default function Clouds() {
  const cloudClass = "cloud bg-white/80 dark:bg-gray-800/50";

  return (
    <div className="clouds">
      <div className={`cloud1 ${cloudClass}`} />
      <div className={`cloud2 ${cloudClass}`} />
      <div className={`cloud3 ${cloudClass}`} />
    </div>
  );
}
