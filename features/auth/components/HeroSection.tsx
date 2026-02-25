/**
 * File Name : features/auth/components/HeroSection.tsx
 * Description : 메인 페이지 히어로 섹션 (로고 및 인트로)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  인트로 문구, 로고 추가
 * 2026.01.11  임도헌   Modified  텍스트 가독성 개선, 애니메이션 유지
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.24  임도헌   Modified  로고 크기 수정
 */

import Logo from "@/components/ui/Logo";

export default function HeroSection() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 z-10 animate-fade-in px-6 text-center">
      {/* 로고 (크기 조절 가능) */}
      <Logo variant="full" size={400} className="mt-16 drop-shadow-xl" />

      {/* 인트로 텍스트 */}
      <div className="flex flex-col gap-2 text-white dark:text-gray-100">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight drop-shadow-md">
          보드게임과 TRPG의 새로운 항구
        </h2>
        <p className="text-base sm:text-lg opacity-90 leading-relaxed drop-shadow-sm font-medium">
          보드포트에서 당신만의 항해를
          <br className="hidden sm:block" /> 시작하세요
        </p>
      </div>
    </div>
  );
}
