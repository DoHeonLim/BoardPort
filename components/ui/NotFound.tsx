/**
 * File Name : components/ui/NotFound.tsx
 * Description : 공통 Not Found 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   Not Found 공통 컴포넌트 생성
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 및 레이아웃 재정리
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 */

"use client";

import Link from "next/link";
import { LifebuoyIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface NotFoundProps {
  title?: string;
  description?: React.ReactNode;
  redirectText?: string;
  redirectHref?: string;
  /** 모달 내부 등에서 상단 여백이나 높이를 조정할 때 사용 */
  className?: string;
  /** 버튼 대신 커스텀 액션을 넣고 싶을 때 (예: 뒤로가기 버튼) */
  action?: React.ReactNode;
}

export default function NotFound({
  title = "항로를 이탈했습니다",
  description = "요청하신 페이지가 지도에 존재하지 않습니다.\n삭제되었거나 주소가 변경되었을 수 있어요.",
  redirectText = "항구로 돌아가기",
  redirectHref = "/products",
  className,
  action,
}: NotFoundProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 min-h-[400px]",
        className
      )}
    >
      {/* 아이콘 영역 (둥둥 떠다니는 효과) */}
      <div className="relative mb-6 animate-float">
        {/* 뒤쪽 은은한 광원 효과 */}
        <div className="absolute inset-0 bg-brand-light/20 blur-2xl rounded-full" />
        <LifebuoyIcon
          className="relative w-24 h-24 text-brand dark:text-brand-light"
          strokeWidth={1.5}
        />
      </div>

      {/* 텍스트 영역 */}
      <h1 className="text-2xl font-bold text-primary mb-2">{title}</h1>

      <p className="text-muted mb-8 whitespace-pre-line leading-relaxed max-w-sm">
        {description}
      </p>

      {/* 액션 버튼 */}
      {action ? (
        action
      ) : (
        <Link
          href={redirectHref}
          className="btn-primary font-semibold inline-flex items-center justify-center min-w-[140px]"
        >
          {redirectText}
        </Link>
      )}
    </div>
  );
}
