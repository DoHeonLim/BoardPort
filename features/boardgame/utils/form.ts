/**
 * File Name : features/boardgame/utils/form.ts
 * Description : 보드게임 연결 폼 payload 파싱 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   상품/게시글/방송 연결용 boardGameIds FormData 파서 추가
 */

/**
 * FormData의 boardGameIds JSON 값을 양의 정수 배열로 정규화
 * 클라이언트 선택 UI에서 이미 제한하더라도 서버 액션에서 중복/비정상 값을 한 번 더 필터링
 *
 * @param value - FormData에서 읽은 boardGameIds 값
 * @param max - 최대 연결 개수
 * @returns 정규화된 보드게임 id 배열. JSON 형식이 잘못되면 null
 */
export function parseBoardGameIdsFormValue(
  value: FormDataEntryValue | null,
  max = 5
): number[] | null {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value.toString());
    if (!Array.isArray(parsed)) return null;

    const ids = parsed
      .map((item) => Number(item))
      .filter((id) => Number.isInteger(id) && id > 0);

    return Array.from(new Set(ids)).slice(0, max);
  } catch {
    return null;
  }
}
