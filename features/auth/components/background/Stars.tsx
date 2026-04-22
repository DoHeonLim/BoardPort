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

import mainPageStyles from "@/features/auth/components/mainPage.module.css";

export default function Stars() {
  return (
    <div
      aria-hidden="true"
      className={`${mainPageStyles.stars} absolute inset-0 z-0 hidden pointer-events-none dark:block`}
    >
      {[...Array(20)].map((_, index) => (
        <div
          key={index}
          className={`${mainPageStyles.star} ${mainPageStyles[`star${index + 1}` as keyof typeof mainPageStyles]}`}
        />
      ))}
    </div>
  );
}
