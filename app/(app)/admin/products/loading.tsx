/**
 * File Name : app/(app)/admin/products/loading.tsx
 * Description : 관리자 상품 관리 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   상품 검색과 목록 구조에 맞는 로딩 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/products/loading.tsx 에서 app/(app)/admin/products/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      <Skeleton className="h-10 w-full max-w-md rounded-xl" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
    </div>
  );
}

