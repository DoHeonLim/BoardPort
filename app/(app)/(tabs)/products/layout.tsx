/**
 * File Name : app/(app)/(tabs)/products/layout.tsx
 * Description : 모달 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.22  임도헌   Created
 * 2024.10.22  임도헌   Modified  모달 레이아웃 추가
 * 2025.05.05  임도헌   Modified  모달 레이아웃 조건 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/products/layout.tsx 에서 app/(app)/(tabs)/products/layout.tsx 로 변경 (라우트 그룹 개편)
 */

import ModalWrapper from "./modal-wrapper";

export default function ModalLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ModalWrapper>{modal}</ModalWrapper>
    </>
  );
}




