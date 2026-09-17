/**
 * File Name : components/global/ModalPresence.tsx
 * Description : 모달 퇴장 전환을 위한 조건부 렌더링 유지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.14  임도헌   Created   닫힘 상태 전달 후 모달 제거 및 동작 줄이기 대응
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";

/** 닫힘 상태를 자식에게 전달한 뒤 퇴장 전환이 끝나면 내부 상태를 정리 */
export default function ModalPresence({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [retained, setRetained] = useState(open);

  useEffect(() => {
    if (open) {
      setRetained(true);
      return;
    }
    const duration = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 200;
    const timer = window.setTimeout(() => setRetained(false), duration);
    return () => window.clearTimeout(timer);
  }, [open]);

  return open || retained ? children : null;
}
