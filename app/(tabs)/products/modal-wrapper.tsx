/**
 * File Name : app/(tabs)/products/modal-wrapper.tsx
 * Description : 제품 모달 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.05  임도헌   Created
 * 2025.05.05  임도헌   Modified  제품 모달 레이아웃 추가
 * 2025.06.08  임도헌   Modified  제품 모달 레이아웃 수정
 */
"use client";

import { usePathname } from "next/navigation";

export default function ModalWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // usePathname을 사용해서 현재 URL 경로 추적 후 /product로 시작하는지 체크 ?(쿼리 파라미터)존재 시 모달 닫히게 구현
  const isModalOpen = /^\/products\/view\/\d+$/.test(pathname);

  if (!isModalOpen) return null;
  return <>{children}</>;
}
