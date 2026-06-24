/**
 * File Name : features/auth/components/AuthPageShell.tsx
 * Description : 공개 인증 페이지 공통 셸 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.13  임도헌   Created   로그인/회원가입/SMS/비밀번호 재설정 계열 페이지의 공통 헤더와 본문 폭을 재사용하는 셸 추가
 */
import type { ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  contentClassName?: string;
}

/**
 * 인증 관련 공개 페이지의 공통 헤더/콘텐츠 폭을 통일하는 셸
 * - main 랜드마크 제공
 * - 상단 로고 우선 로드 적용
 * - 페이지별 타이틀/설명만 바꿔 동일한 구조 재사용
 */
export default function AuthPageShell({
  title,
  description,
  children,
  contentClassName,
}: AuthPageShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-background px-page-x py-page-y transition-colors">
      <div className="mt-10 mb-8 flex flex-col items-center gap-4">
        <div className="rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm">
          <Logo variant="symbol" size={60} priority sizes="60px" />
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>

      <div className={cn("mx-auto w-full max-w-sm", contentClassName)}>
        {children}
      </div>
    </main>
  );
}
