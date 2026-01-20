/**
 * File Name : features\auth\components\AccountBox.tsx
 * Description : 계정 시작 링크 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  회원가입, 로그인 링크 추가
 * 2026.01.10  임도헌   Modified  Glassmorphism UI 개선
 * 2026.01.17  임도헌   Moved     components/auth -> features/auth/components
 */

import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/solid";

export default function AccountBox() {
  return (
    <div className="mt-auto w-full max-w-md p-4 sm:p-6 z-20">
      {/* Glassmorphism Container */}
      <div className="w-full bg-white/20 dark:bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl">
        {/* 회원가입 (Primary Action) */}
        <Link
          href="/create-account"
          className="flex w-full items-center justify-center gap-2 h-14
                     bg-white dark:bg-brand-dark text-brand dark:text-white 
                     rounded-xl font-bold text-lg shadow-md
                     hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span>새로운 선원으로 등록</span>
          <ArrowRightIcon className="w-5 h-5" />
        </Link>

        {/* 로그인 (Secondary Action) */}
        <div className="mt-4 flex items-center justify-center gap-2 text-white/90 text-sm font-medium">
          <span>이미 계정이 있으신가요?</span>
          <Link
            href="/login"
            className="text-white underline decoration-2 underline-offset-4 hover:text-accent-light transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
