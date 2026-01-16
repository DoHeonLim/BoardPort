/**
 * File Name : components/product/ProductCardHeader
 * Description : 게임 타입 및 카테고리 정보를 표시하는 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   게임 타입 및 카테고리 정보 분리 컴포넌트
 * 2026.01.10  임도헌   Modified  시맨틱 클래스 추가
 * 2026.01.12  임도헌   Modified  모바일/좁은 화면에서 부모 카테고리를 렌더링 하지 않게 수정
 */
import { GAME_TYPE_DISPLAY } from "@/lib/constants";

interface ProductCardHeaderProps {
  gameType: string;
  category?: {
    kor_name: string;
    icon: string | null;
    parent?: {
      kor_name: string;
      icon: string | null;
    } | null;
  };
}

export function ProductCardHeader({
  gameType,
  category,
}: ProductCardHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted">
      <span className="font-medium text-brand dark:text-brand-light shrink-0">
        {GAME_TYPE_DISPLAY[gameType as keyof typeof GAME_TYPE_DISPLAY] ||
          gameType}
      </span>

      {category && (
        <>
          <span className="text-border dark:text-neutral-700">|</span>
          <span className="truncate max-w-[140px] sm:max-w-none text-muted flex items-center gap-0.5">
            {/* 부모 카테고리는 sm 이상에서만 노출 (모바일 숨김) */}
            {category.parent && (
              <span className="hidden sm:inline">
                {category.parent.icon} {category.parent.kor_name} &gt;
              </span>
            )}

            {/* 자식(현재) 카테고리는 항상 노출 */}
            <span>
              {category.icon} {category.kor_name}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
