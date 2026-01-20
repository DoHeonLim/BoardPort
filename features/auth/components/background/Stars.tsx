/**
 * File Name : features/auth/components/background/Stars.tsx
 * Description : 별 컴포넌트 - 다크모드에서만
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.27  임도헌   Created
 * 2025.05.27  임도헌   Modified  별 컴포넌트 추가
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 */

export default function Stars() {
  return (
    <div className="stars hidden dark:block absolute inset-0 pointer-events-none z-0">
      {[...Array(20)].map((_, index) => (
        <div key={index} className={`star star${index + 1}`} />
      ))}
    </div>
  );
}
