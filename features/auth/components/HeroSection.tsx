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
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 인증 히어로 타이포 스케일과 계층을 정리
 * 2026.04.12  임도헌   Modified  로그인 전 메인 LCP 이미지를 responsive sizes/priority 기준으로 최적화
 * 2026.04.12  임도헌   Modified  숨김 로고 3개를 단일 responsive 로고로 통합해 중복 이미지 요청을 제거
 * 2026.04.12  임도헌   Modified  Fold 계열 좁은 폭에서 헤드라인이 단어 중간에서 끊기지 않도록 문장 덩어리 단위 줄바꿈을 보강
 * 2026.04.12  임도헌   Modified  모바일 로그인 전 메인의 존재감을 회복하기 위해 로고·카피 비율과 간격을 미세 조정
 * 2026.04.13  임도헌   Modified  현재 구조와 맞지 않는 중복 인라인 주석을 정리하고 핵심 설명만 유지
 */

import Logo from "@/components/ui/Logo";

const heroLogoSizes =
  "(max-width: 380px) 220px, (max-width: 430px) 240px, (max-width: 640px) 252px, (max-width: 1024px) 320px, 400px";

export default function HeroSection() {
  return (
    <div className="z-10 flex flex-col items-center justify-center gap-5 px-5 text-center max-[380px]:gap-4 sm:gap-6">
      <Logo
        variant="full"
        size={400}
        priority
        sizes={heroLogoSizes}
        quality={72}
        fluid
        className="w-[246px] drop-shadow-xl max-[380px]:w-[222px] sm:w-[320px] lg:w-[400px]"
      />

      <div className="flex max-w-[19rem] flex-col gap-2 text-white dark:text-gray-100 max-[380px]:gap-1.5 sm:max-w-none sm:gap-2.5">
        <h2 className="break-keep text-[1.85rem] font-bold tracking-tight leading-[1.12] drop-shadow-md max-[380px]:text-[1.58rem] sm:text-3xl">
          <span className="whitespace-nowrap">보드게임과 TRPG의</span>{" "}
          <span className="whitespace-nowrap">새로운 항구</span>
        </h2>
        <p className="text-[1.02rem] font-normal leading-relaxed text-white/88 drop-shadow-sm max-[380px]:text-sm sm:text-lg">
          거래와 대화, 라이브가 이어지는
          <br className="hidden sm:block" /> 보드포트에서 항해를 시작하세요
        </p>
      </div>
    </div>
  );
}
