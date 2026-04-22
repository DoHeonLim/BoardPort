/**
 * File Name : features/user/components/admin/AdminSectionHeading.tsx
 * Description : 현재 관리자 섹션명을 헤더에 표시하는 클라이언트 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   sticky 관리자 헤더에 현재 섹션명과 보조 라벨을 표시하도록 추가
 * 2026.03.30  임도헌   Modified  posts/products/logs 등 세부 관리 화면도 같은 섹션 헤더 문법으로 읽히도록 유지
 * 2026.04.10  임도헌   Modified  관리자 섹션 헤더의 상단 라벨 크기를 공통 타이포 스케일로 정리
 */

"use client";

import { usePathname } from "next/navigation";

const SECTION_TITLES = [
  { prefix: "/admin/reports", label: "신고 관리" },
  { prefix: "/admin/users", label: "유저 관리" },
  { prefix: "/admin/products", label: "상품 관리" },
  { prefix: "/admin/posts", label: "게시글 관리" },
  { prefix: "/admin/streams", label: "방송 관리" },
  { prefix: "/admin/logs", label: "감사 로그" },
  { prefix: "/admin", label: "대시보드" },
];

export default function AdminSectionHeading() {
  const pathname = usePathname();
  const currentSection =
    SECTION_TITLES.find((item) => pathname?.startsWith(item.prefix))?.label ??
    "관리자 콘솔";

  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
        Admin Console
      </p>
      <h2 className="truncate text-sm font-bold text-primary sm:text-base">
        {currentSection}
      </h2>
    </div>
  );
}
