/**
 * File Name : app/(app)/(tabs)/products/modal-wrapper.tsx
 * Description : 제품 모달 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.05  임도헌   Created
 * 2025.05.05  임도헌   Modified  제품 모달 레이아웃 추가
 * 2025.06.08  임도헌   Modified  제품 모달 레이아웃 수정
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/products/modal-wrapper.tsx 에서 app/(app)/(tabs)/products/modal-wrapper.tsx 로 변경 (라우트 그룹 개편)
 */
"use client";

import { usePathname } from "next/navigation";

export default function ModalWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // 제품 상세 인터셉트 경로일 때만 모달 슬롯 유지
  const isModalOpen = /^\/products\/view\/\d+$/.test(pathname);

  if (!isModalOpen) return null;
  return <>{children}</>;
}
