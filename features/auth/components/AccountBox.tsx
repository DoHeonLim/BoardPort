/**
 * File Name : features/auth/components/AccountBox.tsx
 * Description : 메인 페이지 계정 시작(로그인/회원가입) 링크 박스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  회원가입, 로그인 링크 추가
 * 2026.01.10  임도헌   Modified  Glassmorphism UI 개선
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.03.14  임도헌   Modified  재방문 사용자 접근성을 고려해 로그인 버튼을 primary로, 회원가입을 secondary로 재배치
 * 2026.03.25  임도헌   Modified  히어로와의 간격 및 라이트모드 표면 톤을 조정해 로그인 전 메인 CTA 위계를 정리
 * 2026.03.25  임도헌   Modified  모바일에서 히어로와 함께 읽히도록 CTA 박스와 버튼 비율을 한 단계 축소
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 로그인 전 메인 CTA 타이포 크기와 무게를 정리
 * 2026.04.12  임도헌   Modified  로그인 전 메인 CTA 카드의 표면감과 대비를 정리해 전환성과 판독성을 보강
 * 2026.04.13  임도헌   Modified  회원가입 버튼 테두리 톤을 카드 주변 색감에 맞게 부드럽게 조정
 * 2026.04.20  임도헌   Modified  로그인 전 메인 CTA 전용 비주얼 규칙을 CSS Module로 정리해 className 복잡도를 낮춤
 * 2026.07.06  임도헌   Modified  로그인 전 메인 CTA 하단에 약관/개인정보 처리방침 링크 추가
 */

import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import mainPageStyles from "@/features/auth/components/mainPage.module.css";
import LegalLinks from "@/features/legal/components/LegalLinks";

export default function AccountBox() {
  return (
    <div className="z-20 w-full max-w-md px-4 pb-2 pt-1 sm:px-6 sm:pb-4">
      <div className={mainPageStyles.accountCard}>
        <Link
          href="/login"
          className={`${mainPageStyles.mainPagePrimaryCta} focus-ring-strong`}
        >
          <span>로그인하기</span>
          <ArrowRightIcon className="h-5 w-5" />
        </Link>

        <Link
          href="/create-account"
          className={`${mainPageStyles.mainPageSecondaryCta} focus-ring-soft`}
        >
          <span>새로운 선원으로 등록</span>
        </Link>
      </div>
      <LegalLinks className="mt-4 text-white/75" compact inverse />
    </div>
  );
}
