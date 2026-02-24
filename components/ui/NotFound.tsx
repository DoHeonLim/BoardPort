/**
 * File Name : components/ui/NotFound.tsx
 * Description : 공통 Not Found(404) UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   Not Found 공통 컴포넌트 생성
 * 2026.01.11  임도헌   Modified  시맨틱 토큰 적용 및 레이아웃 재정리
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.02.02  임도헌   Modified  주석 상세 설명 및 Props 타입 정의 보강
 */

"use client";

import Link from "next/link";
import { LifebuoyIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface NotFoundProps {
  /** 페이지 제목 (기본값: "항로를 이탈했습니다") */
  title?: string;
  /** 상세 설명 텍스트 또는 노드 */
  description?: React.ReactNode;
  /** 리다이렉트 버튼 텍스트 (기본값: "항구로 돌아가기") */
  redirectText?: string;
  /** 리다이렉트 경로 (기본값: "/products") */
  redirectHref?: string;
  /** 컨테이너 추가 스타일 (상단 여백/높이 조정 등) */
  className?: string;
  /** 기본 버튼 대신 사용할 커스텀 액션 요소 (예: 뒤로가기 버튼) */
  action?: React.ReactNode;
}

/**
 * 404 Not Found 또는 데이터 없음 상황을 표시하는 공통 UI 컴포넌트
 *
 * - 아이콘(LifebuoyIcon)과 둥둥 떠다니는 애니메이션(float)을 포함
 * - 제목, 설명, 리다이렉트 버튼을 props로 커스터마이징 가능
 * - `action` prop을 통해 기본 버튼 대신 커스텀 버튼 주입 가능
 *
 * @param {NotFoundProps} props - 컴포넌트 설정 값
 * @returns {JSX.Element} Not Found UI
 */
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
