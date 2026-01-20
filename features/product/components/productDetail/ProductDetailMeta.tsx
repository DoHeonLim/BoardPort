/**
 * File Name : features/product/components/productDetail/ProductDetailMeta.tsx
 * Description : 제품 판매자 정보 및 생성일 표시 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   판매자 프로필 및 생성일 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */
"use client";

import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";

interface ProductDetailMetaProps {
  username: string;
  avatar: string | null;
  created_at: string;
}

export default function ProductDetailMeta({
  username,
  avatar,
  created_at,
}: ProductDetailMetaProps) {
  return (
    <div className="flex items-center justify-between px-page-x py-3 border-b border-border bg-surface">
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-muted">판매자</span>
        <UserAvatar avatar={avatar} username={username} size="sm" />
      </div>
      <div className="text-xs text-muted">
        <TimeAgo date={created_at} />
      </div>
    </div>
  );
}
