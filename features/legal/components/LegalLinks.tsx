/**
 * File Name : features/legal/components/LegalLinks.tsx
 * Description : 약관/개인정보 처리방침 링크 묶음
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.07.06  임도헌   Created   공개/인증 화면에서 재사용할 정책 링크 묶음 추가
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LegalLinksProps {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
}

/**
 * 서비스 정책 문서로 이동하는 공통 링크 묶음
 * - 공개 메인, 인증 화면, 설정 메뉴 등에서 동일한 링크 순서를 유지
 * - 작은 보조 링크로 노출해 핵심 CTA 흐름을 방해하지 않도록 구성
 */
export default function LegalLinks({
  className,
  compact,
  inverse,
}: LegalLinksProps) {
  const linkClassName = cn(
    "focus-ring-soft rounded-md px-1 py-0.5 font-medium transition-colors hover:underline",
    inverse ? "hover:text-white" : "hover:text-primary",
    compact && "px-0.5"
  );

  return (
    <nav
      aria-label="서비스 약관 및 정책"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted",
        className
      )}
    >
      <Link
        href="/terms"
        className={linkClassName}
      >
        이용약관
      </Link>
      <span
        aria-hidden="true"
        className={cn(inverse ? "text-white/45" : "text-muted/60")}
      >
        ·
      </span>
      <Link
        href="/privacy"
        className={linkClassName}
      >
        개인정보 처리방침
      </Link>
    </nav>
  );
}
