/**
 * File Name : features/boardgame/utils/format.ts
 * Description : 보드게임 공개 UI 표시 helper
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   상세/목록 컴포넌트에서 공유하는 표시 문구 helper 분리
 */

/**
 * BGG 추천 인원 메타데이터의 공개 상세용 문구 변환
 *
 * @param bestPlayers - 최적 인원 표기
 * @param goodPlayers - 추천 인원 목록
 * @returns 최적/추천 인원 요약 문구
 */
export function getRecommendedPlayersText(
  bestPlayers: string | null,
  goodPlayers: string[]
): string {
  const parts = [];
  if (bestPlayers) parts.push(`최적 ${bestPlayers}명`);
  if (goodPlayers.length) parts.push(`추천 ${goodPlayers.join(", ")}명`);

  return parts.length ? parts.join(" · ") : "정보 없음";
}

/**
 * 검수된 한국어 taxonomy명 우선 사용 및 BGG 원문명 fallback 표시
 *
 * @param item - category 또는 mechanic taxonomy
 * @returns 공개 UI용 taxonomy 라벨
 */
export function getTaxonomyLabel(item: {
  bggName: string;
  koName: string | null;
}): string {
  return item.koName || item.bggName;
}
