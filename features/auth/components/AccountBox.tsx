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
 * 2026.03.25  임도헌   Modified  히어로와의 간격 및 라이트모드 표면 톤을 조정해 랜딩 CTA 위계를 정리
 * 2026.03.25  임도헌   Modified  모바일에서 히어로와 함께 읽히도록 CTA 박스와 버튼 비율을 한 단계 축소
 */

import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/solid";

export default function AccountBox() {
  return (
    <div className="z-20 w-full max-w-md px-4 pb-2 pt-1 sm:px-6 sm:pb-4">
      {/* Glassmorphism Container */}
      <div className="w-full rounded-2xl border border-white/25 bg-white/[0.16] p-4 shadow-lg backdrop-blur-md sm:p-5 dark:border-white/15 dark:bg-black/[0.28]">
        {/* 로그인 (Primary Action) */}
        <Link
          href="/login"
          className="flex h-[3.15rem] w-full items-center justify-center gap-2
                     bg-white dark:bg-brand-dark text-brand dark:text-white 
                     rounded-xl font-bold text-[1.06rem] shadow-md sm:h-14 sm:text-lg
                     hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span>로그인하기</span>
          <ArrowRightIcon className="w-5 h-5" />
        </Link>

        {/* 회원가입 (Secondary Action) */}
        <Link
          href="/create-account"
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 text-white font-semibold text-[0.98rem] transition-all hover:bg-white/15 active:scale-[0.98] sm:h-12 sm:text-base"
        >
          <span>새로운 선원으로 등록</span>
        </Link>
      </div>
    </div>
  );
}
