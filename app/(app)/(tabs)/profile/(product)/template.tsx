"use client";

/**
 * File Name : app/(app)/(tabs)/profile/(product)/template.tsx
 * Description : 프로필 상품 하위 페이지 전환 시 상단 스크롤을 초기화하는 템플릿
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.18  임도헌   Created   판매/구매/찜 형제 경로 전환마다 재마운트되는 템플릿에서 상단 스크롤 초기화 처리
 */

import { useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";

function scrollWindowToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function ProfileProductTemplate({
  children,
}: {
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    scrollWindowToTop();
  }, []);

  useEffect(() => {
    let raf2 = 0;
    // 형제 라우트 전환 직후 1회 추가 보정, 탭/레이아웃 재배치 이후에도 스크롤 상단 고정
    const raf1 = window.requestAnimationFrame(() => {
      scrollWindowToTop();
      raf2 = window.requestAnimationFrame(() => {
        scrollWindowToTop();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) {
        window.cancelAnimationFrame(raf2);
      }
    };
  }, []);

  return children;
}
