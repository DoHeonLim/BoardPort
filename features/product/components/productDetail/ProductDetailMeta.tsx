/**
 * File Name : features/product/components/productDetail/ProductDetailMeta.tsx
 * Description : 판매자 정보 및 작성일 표시
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   판매자 프로필 및 생성일 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.03.14  임도헌   Modified  조회수 뱃지를 이미지 오버레이에서 메타 섹션 우측으로 이동
 * 2026.03.19  임도헌   Modified  작은 화면에서는 판매자 정보와 조회수/시간 메타를 2행으로 분리해 긴 닉네임 밀도를 완화
 * 2026.03.22  임도헌   Modified  제품 상세 메타 바 구분선을 border-border-subtle로 맞춰 최근 상세 톤과 통일
 * 2026.03.25  임도헌   Modified  판매자 라벨 제거 및 모바일/데스크톱 메타 바를 단일 행 리듬으로 재정렬
 * 2026.03.25  임도헌   Modified  판매자 메타 시작점을 좌측에 더 붙여 이미지-메타 흐름을 정렬
 */

"use client";

import UserAvatar from "@/components/global/UserAvatar";
import TimeAgo from "@/components/ui/TimeAgo";
import { EyeIcon } from "@heroicons/react/24/solid";

interface ProductDetailMetaProps {
  username: string;
  avatar: string | null;
  created_at: string;
  views: number | null;
}

/**
 * 판매자 프로필(아바타, 이름)과 제품 등록 시간을 표시하는 얇은 바
 */
export default function ProductDetailMeta({
  username,
  avatar,
  created_at,
  views,
}: ProductDetailMetaProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface px-page-x py-2.5 sm:py-3">
      <div className="min-w-0 flex-1">
        <UserAvatar
          avatar={avatar}
          username={username}
          size="sm"
          compact
          className="min-w-0 justify-start"
        />
      </div>
      <div className="shrink-0 flex items-center gap-3 text-xs text-muted">
        {/* 조회수 */}
        {views != null && (
          <div className="flex items-center gap-1">
            <EyeIcon className="size-3.5" />
            <span>{views.toLocaleString()}</span>
          </div>
        )}
        <TimeAgo date={created_at} />
      </div>
    </div>
  );
}
