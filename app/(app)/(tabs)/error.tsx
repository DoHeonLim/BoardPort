/**
 * File Name : app/(app)/(tabs)/error.tsx
 * Description : 탭 목록 영역 공용 오류 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   목록 오류에서도 탭 레이아웃을 유지하는 복구 화면 추가
 */

"use client";

import AppErrorFallback, {
  type RouteErrorBoundaryProps,
} from "@/components/global/AppErrorFallback";

/**
 * 상품·게시글·채팅·방송·프로필 탭의 하위 오류를 탭 레이아웃 안에서 복구
 *
 * @param props - Next.js가 전달하는 오류 객체와 segment 재시도 함수
 * @returns 탭 목록 영역 오류 복구 화면
 */
export default function TabsError({ error, reset }: RouteErrorBoundaryProps) {
  return (
    <AppErrorFallback
      error={error}
      reset={reset}
      title="목록을 불러오지 못했습니다"
      description="잠시 후 다시 시도하거나 상품 목록에서 다른 메뉴로 이동해 주세요."
    />
  );
}
