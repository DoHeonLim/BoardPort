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
 * 2026.03.08  임도헌   Modified  히어로 진입 fade 애니메이션 제거
 * 2026.03.25  임도헌   Modified  모바일 로고 비율과 카피 간격을 조정해 CTA 위계와 첫인상 균형을 정리
 * 2026.03.25  임도헌   Modified  iPhone SE급 소형 화면에서 헤드라인과 로고 비율을 추가 미세 조정
 * 2026.03.25  임도헌   Modified  iPhone SE급에서 헤드라인 크기를 더 낮춰 CTA 접근성을 높임
 * 2026.03.25  임도헌   Modified  일반 모바일 폭에서도 로고·헤드라인·CTA 비율이 자연스럽도록 전체 스케일을 재조정
 */

import Logo from "@/components/ui/Logo";

export default function HeroSection() {
  return (
    <div className="z-10 flex flex-col items-center justify-center gap-4 px-5 text-center max-[380px]:gap-3 sm:gap-6">
      {/* 로고 (화면 크기별 비율 조정) */}
      <div className="mt-7 block origin-center drop-shadow-xl max-[380px]:mt-6 max-[380px]:scale-[0.88] sm:hidden">
        <Logo variant="full" size={248} />
      </div>
      <div className="mt-10 hidden drop-shadow-xl sm:block lg:hidden">
        <Logo variant="full" size={340} />
      </div>
      <div className="mt-12 hidden drop-shadow-xl lg:block">
        <Logo variant="full" size={400} />
      </div>

      {/* 인트로 텍스트 */}
      <div className="flex flex-col gap-1 text-white dark:text-gray-100 sm:gap-2">
        <h2 className="text-[1.5rem] font-bold tracking-tight leading-snug drop-shadow-md max-[380px]:text-[1.35rem] sm:text-2xl">
          보드게임과 TRPG의 새로운 항구
        </h2>
        <p className="text-base font-medium leading-relaxed opacity-90 drop-shadow-sm max-[380px]:text-[0.92rem] sm:text-lg">
          보드포트에서 당신만의 항해를
          <br className="hidden sm:block" /> 시작하세요
        </p>
      </div>
    </div>
  );
}
