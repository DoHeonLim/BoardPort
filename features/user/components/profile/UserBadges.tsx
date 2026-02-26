/**
 * File Name : features/user/components/profile/UserBadges.tsx
 * Description : 유저 보유 뱃지 목록 (가로 스크롤)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.07  임도헌   Created
 * 2024.12.07  임도헌   Modified  다른 유저 프로필 페이지 추가
 * 2024.12.07  임도헌   Modified  무한 스크롤 추가
 * 2024.12.07  임도헌   Modified  평균 평점 및 갯수 로직 수정
 * 2024.12.12  임도헌   Modified  photo속성에서 images로 변경
 * 2024.12.22  임도헌   Modified  제품 모델 변경에 따른 제품 타입 변경
 * 2024.12.29  임도헌   Modified  다른 유저 프로필 컴포넌트 스타일 수정
 * 2025.05.06  임도헌   Modified  그리드/리스트 뷰 모드 추가
 * 2026.01.15  임도헌   Modified  [Rule 5.1] 시맨틱 토큰(bg-brand/5) 적용
 * 2026.01.17  임도헌   Moved     components/profile -> features/user/components/profile
 * 2026.01.29  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
import Image from "next/image";
import { getBadgeKoreanName } from "@/features/user/utils/badge";
import type { Badge } from "@/features/user/types";

interface UserBadgesProps {
  badges?: Badge[];
  max?: number;
}

/**
 * 유저 뱃지 목록 컴포넌트
 *
 * [기능]
 * 1. 유저가 획득한 뱃지들을 가로 스크롤 가능한 리스트로 표시
 * 2. `max` prop으로 표시 개수를 제한 (기본 5개)
 * 3. 뱃지 이름(Code)을 한글 이름으로 변환하여 표시(`getBadgeKoreanName`).
 * 4. 획득한 뱃지가 없을 경우 안내 메시지를 표시
 */
export default function UserBadges({ badges = [], max = 5 }: UserBadgesProps) {
  if (!badges || badges.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted bg-surface-dim/30 rounded-xl border border-dashed border-border">
        아직 획득한 뱃지가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-page-x px-page-x scrollbar-thin scrollbar-thumb-border dark:scrollbar-thumb-neutral-700">
      {badges.slice(0, max).map((badge) => (
        <div
          key={badge.id}
          className="flex flex-col items-center justify-center p-3 min-w-[84px] w-[84px] rounded-xl bg-brand/5 border border-brand/10 dark:bg-brand-light/10 dark:border-brand-light/20 shrink-0"
          title={badge.description}
        >
          <div className="relative w-10 h-10 mb-2">
            <Image
              src={`${badge.icon}/public`}
              alt={badge.name}
              fill
              className="object-contain"
              sizes="40px"
            />
          </div>
          <span className="text-[11px] font-medium text-center text-primary leading-tight line-clamp-2">
            {getBadgeKoreanName(badge.name)}
          </span>
        </div>
      ))}
    </div>
  );
}
