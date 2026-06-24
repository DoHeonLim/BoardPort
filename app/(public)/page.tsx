/**
 * File Name : app/(public)/page.tsx
 * Description : 로그인 전 메인 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  메인 페이지 추가
 * 2024.12.12  임도헌   Modified  다크모드 적용, 디자인 변경
 * 2024.12.14  임도헌   Modified  스타일 변경
 * 2024.12.24  임도헌   Modified  스타일 재변경
 * 2025.04.29  임도헌   Modified  UI 수정
 * 2025.05.30  임도헌   Modified  background 관련 컴포넌트 분리(Stars, Clouds, Seagulls, Waves)
 * 2025.05.30  임도헌   Modified  메인 콘텐츠, 버튼 영역 컴포넌트로 분리
 * 2026.01.10  임도헌   Modified  구조 개선
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.03.25  임도헌   Modified  로그인 전 메인 히어로와 CTA 간 간격을 줄이고 모바일 첫인상 위계를 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/page.tsx 에서 app/(public)/page.tsx 로 변경 (라우트 그룹 개편)
 */

import AccountBox from "@/features/auth/components/AccountBox";
import mainPageStyles from "@/features/auth/components/mainPage.module.css";
import Clouds from "@/features/auth/components/background/Clouds";
import Seagulls from "@/features/auth/components/background/Seagulls";
import Stars from "@/features/auth/components/background/Stars";
import Waves from "@/features/auth/components/background/Waves";
import HeroSection from "@/features/auth/components/HeroSection";

export default function Main() {
  return (
    <main
      className={`${mainPageStyles.mainPageShell} relative flex flex-col items-center justify-between w-full
                 bg-gradient-to-b from-secondary via-brand to-brand-dark 
                 dark:from-gray-900 dark:via-brand-dark dark:to-black 
                 overflow-hidden`}
    >
      <Stars />
      <Clouds />
      <Seagulls />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-9 px-4 pt-8 pb-28 max-[380px]:gap-8 max-[380px]:pb-24 sm:gap-11 sm:pt-10 sm:pb-24">
        <HeroSection />
        <AccountBox />
      </div>

      <Waves />
    </main>
  );
}
