/**
 * File Name : features/stream/components/StreamEmptyState.tsx
 * Description : 스트리밍 목록 Empty 상태
 * Author : 임도헌
 *
 * History
 * 2025.08.25  임도헌   Created
 * 2025.09.10  임도헌   Modified  a11y(role/aria-live) 및 복구 링크(필터 초기화/전체 보기) 추가
 * 2026.01.14  임도헌   Modified  [UI] 공통 Empty State 디자인 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */
import Link from "next/link";
import { VideoCameraIcon } from "@heroicons/react/24/outline";

interface Props {
  keyword?: string;
  category?: string;
  scope?: "all" | "following";
}

export default function StreamEmptyState({ keyword, category, scope }: Props) {
  const hasKeyword = !!keyword;
  const hasCategory = !!category;
  const isFollowingScope = scope === "following";

  let title = "진행 중인 방송이 없습니다";
  let description = "새로운 방송을 시작해보세요!";

  if (hasKeyword) {
    title = `'${keyword}' 검색 결과가 없습니다`;
    description = "다른 키워드로 검색해보세요.";
  } else if (hasCategory) {
    title = "이 카테고리의 방송이 없습니다";
    description = "다른 카테고리를 확인해보세요.";
  } else if (isFollowingScope) {
    title = "팔로잉 방송이 없습니다";
    description = "관심 있는 스트리머를 팔로우해보세요.";
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="p-4 rounded-full bg-surface-dim mb-4">
        <VideoCameraIcon className="size-10 text-muted/50" />
      </div>

      <h3 className="text-lg font-bold text-primary mb-1">{title}</h3>
      <p className="text-sm text-muted mb-6">{description}</p>

      <div className="flex gap-3">
        {(hasKeyword || hasCategory) && (
          <Link href="/streams" className="btn-secondary h-10 text-sm">
            전체 목록 보기
          </Link>
        )}
        {isFollowingScope && (
          <Link href="/streams" className="btn-primary h-10 text-sm">
            전체 방송 보기
          </Link>
        )}
      </div>
    </div>
  );
}
