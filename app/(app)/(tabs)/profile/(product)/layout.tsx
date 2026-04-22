/**
 * File Name : app/(app)/(tabs)/profile/(product)/layout.tsx
 * Description : 프로필 제품 하위 섹션(판매/구매/찜) 공통 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   판매/구매/찜 형제 경로의 앱바와 스크롤 초기화 정책을 공통 레이아웃으로 통합
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/(product)/layout.tsx 에서 app/(app)/(tabs)/profile/(product)/layout.tsx 로 변경 (라우트 그룹 개편)
 */

import type { ReactNode } from "react";
import ProfileProductSectionLayout from "@/features/product/components/ProfileProductSectionLayout";

/**
 * 프로필 > 제품 하위 섹션 공통 레이아웃
 *
 * - 판매 내역, 구매 내역, 찜한 내역의 앱바 구조를 하나로 통합
 * - 형제 경로 이동 시 남아 있던 스크롤 문맥을 레이아웃 단에서 일관되게 초기화
 */
export default function ProfileProductLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ProfileProductSectionLayout>{children}</ProfileProductSectionLayout>;
}



