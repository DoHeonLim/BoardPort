/**
 * File Name : app/(tabs)/profile/(product)/my-likes/loading.tsx
 * Description : 나의 찜한 내역 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   찜한 내역 전용 ProductCard 리스트 스켈레톤 적용
 * 2026.03.12  임도헌   Modified  프로필 찜한 내역 스켈레톤 구분선을 border-border-subtle 톤으로 통일
 * 2026.03.26  임도헌   Modified  공용 ProductListSkeleton을 재사용해 프로필 찜 목록 로딩 패턴을 통일
 */

import ProductListSkeleton from "@/features/product/components/ProductListSkeleton";

export default function Loading() {
  return (
    <div className="px-page-x py-6">
      <ProductListSkeleton viewMode="list" count={4} />
    </div>
  );
}
