/**
File Name : app/(auth)/page
Description : 메인 페이지
Author : 임도헌

History
Date        Author   Status    Description
2024.10.01  임도헌   Created
2024.10.01  임도헌   Modified  메인 페이지 추가
2024.12.12  임도헌   Modified  다크모드 적용, 디자인 변경
2024.12.14  임도헌   Modified  스타일 변경
2024.12.24  임도헌   Modified  스타일 재변경
2025.04.29  임도헌   Modified  UI 수정
2025.05.30  임도헌   Modified  background 관련 컴포넌트 분리(Stars, Clouds, Seagulls, Waves)
2025.05.30  임도헌   Modified  메인 콘텐츠, 버튼 영역 컴포넌트로 분리
2026.01.10  임도헌   Modified  구조 개선
*/

import AccountBox from "@/features/auth/components/AccountBox";
import Clouds from "@/features/auth/components/background/Clouds";
import Seagulls from "@/features/auth/components/background/Seagulls";
import Stars from "@/features/auth/components/background/Stars";
import Waves from "@/features/auth/components/background/Waves";
import HeroSection from "@/features/auth/components/HeroSection";

export default function Main() {
  return (
    <div
      // [Design] Ocean Gradient Background
      className="relative flex flex-col items-center justify-between min-h-[100dvh] w-full
                 bg-gradient-to-b from-secondary via-brand to-brand-dark 
                 dark:from-gray-900 dark:via-brand-dark dark:to-black 
                 overflow-hidden"
    >
      {/* 백그라운드 배경요소 - 별(밤하늘), 구름(lignt-white, dark-gray), 갈매기 */}
      <Stars />
      <Clouds />
      <Seagulls />

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center w-full px-4 pt-10 pb-32">
        <HeroSection />
        <AccountBox />
      </div>

      {/* 파도 */}
      <Waves />
    </div>
  );
}
