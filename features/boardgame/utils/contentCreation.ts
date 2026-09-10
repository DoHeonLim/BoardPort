/**
 * File Name : features/boardgame/utils/contentCreation.ts
 * Description : 보드게임 상세의 연결 콘텐츠 생성 문맥 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.10  임도헌   Created   공개 연결 옵션 기준 작성 폼 사전 선택 검증 추가
 */

import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

/**
 * URL의 보드게임 ID를 공개 연결 옵션과 대조해 작성 폼 초기 선택값으로 변환
 *
 * @param rawBoardGameId - URL query의 보드게임 ID
 * @param options - 작성 폼에서 연결 가능한 공개 보드게임 목록
 * @returns 공개 옵션과 일치하는 단일 ID 배열
 */
export function getBoardGameCreationPrefill(
  rawBoardGameId: string | undefined,
  options: BoardGameRelationOption[]
): number[] {
  const boardGameId = parseBoardGameCreationId(rawBoardGameId);
  if (!boardGameId) return [];

  return options.some((option) => option.id === boardGameId)
    ? [boardGameId]
    : [];
}

/**
 * URL의 보드게임 ID를 안전한 양의 정수로 정규화
 *
 * @param rawBoardGameId - URL query의 보드게임 ID
 * @returns 유효한 보드게임 ID 또는 null
 */
export function parseBoardGameCreationId(
  rawBoardGameId: string | undefined
): number | null {
  if (!rawBoardGameId || !/^[1-9]\d*$/.test(rawBoardGameId)) return null;

  const boardGameId = Number(rawBoardGameId);
  return Number.isSafeInteger(boardGameId) ? boardGameId : null;
}

/**
 * 보드게임 상세에서 연결 콘텐츠 작성 화면으로 이동할 URL 구성
 *
 * @param pathname - 콘텐츠 작성 화면 경로
 * @param boardGameId - 사전 선택할 보드게임 ID
 * @returns 보드게임 상세 복귀 문맥을 포함한 작성 화면 URL
 */
export function buildBoardGameContentCreationHref(
  pathname: "/products/add" | "/posts/add" | "/streams/add",
  boardGameId: number
): string {
  const returnTo = `/boardgames/${boardGameId}`;
  const params = new URLSearchParams({
    boardGameId: String(boardGameId),
    returnTo,
  });

  return `${pathname}?${params.toString()}`;
}
