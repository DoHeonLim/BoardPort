/**
 * File Name : components/global/SkipLink.tsx
 * Description : 키보드 사용자가 반복 탐색 영역을 건너뛰는 공통 본문 바로가기 링크
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   포커스 시 노출되는 공통 본문 바로가기 링크 추가
 */

/** 키보드 포커스가 들어오면 표시되어 공통 본문 컨테이너로 이동한다. */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="focus-ring-soft sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg"
    >
      본문으로 건너뛰기
    </a>
  );
}
