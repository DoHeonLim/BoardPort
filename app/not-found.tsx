/**
 * File Name : app/not-found.tsx
 * Description : 전역 404 Not Found 페이지 (보드포트 컨셉)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.09  임도헌   Created   항해 컨셉(항로 이탈) 커스텀 404 페이지 추가
 * 2026.01.11  임도헌   Modified  공통 컴포넌트인 NotFound로 통합
 * 2026.03.06  임도헌   Modified  전역 상태 화면 여백을 시맨틱 상태 레이아웃 기준으로 정리
 */

import NotFound from "@/components/ui/NotFound";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-page-x py-10 sm:py-16">
      <NotFound />
    </div>
  );
}
