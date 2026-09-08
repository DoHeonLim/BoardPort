/**
 * File Name : features/stream/utils/recordingCursor.ts
 * Description : 다시보기 목록 정렬값 기반 복합 커서 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.26  임도헌   Created   최신·인기 정렬의 동률을 안전하게 잇는 불투명 복합 커서 추가
 * 2026.08.27  임도헌   Modified  서버 전용 경계와 과도하게 긴·비정규 base64url 커서 거부 보강
 */

import "server-only";
import type {
  RecordingListCursor,
  RecordingSort,
} from "@/features/stream/types";

const CURSOR_VERSION = 1;
/** 비정상적으로 큰 URL 입력이 JSON decode 비용을 키우지 못하도록 제한한다. */
const MAX_CURSOR_LENGTH = 512;

/** 서버가 해석한 다시보기 복합 커서 값 */
export interface DecodedRecordingCursor {
  sort: RecordingSort;
  readyAt: Date;
  id: number;
  views: number;
}

/** URL에 직렬화하는 최소 복합 정렬 payload */
interface RecordingCursorPayload {
  v: typeof CURSOR_VERSION;
  s: RecordingSort;
  r: string;
  i: number;
  w: number;
}

/** 다음 커서를 생성할 마지막 다시보기 카드의 정렬값 */
interface RecordingCursorSource {
  vodId: number;
  readyAt: Date | string | null;
  viewCount?: number;
}

/**
 * 복합 정렬의 마지막 VOD 값을 단일 base64url 커서로 인코딩한다.
 *
 * @param sort - 현재 다시보기 정렬
 * @param recording - 마지막 VOD의 ID·준비 시각·조회수
 * @returns 검증 가능한 불투명 커서 또는 정렬값이 불완전하면 null
 */
export function encodeRecordingCursor(
  sort: RecordingSort,
  recording: RecordingCursorSource
): RecordingListCursor | null {
  if (!recording.readyAt) return null;

  const readyAt = new Date(recording.readyAt);
  if (
    Number.isNaN(readyAt.getTime()) ||
    !Number.isSafeInteger(recording.vodId) ||
    recording.vodId <= 0 ||
    typeof recording.viewCount !== "number" ||
    !Number.isSafeInteger(recording.viewCount) ||
    recording.viewCount < 0
  ) {
    return null;
  }

  const payload: RecordingCursorPayload = {
    v: CURSOR_VERSION,
    s: sort,
    r: readyAt.toISOString(),
    i: recording.vodId,
    w: recording.viewCount,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * 요청 커서를 검증하고 현재 정렬에 맞는 DB 비교값으로 복원한다.
 *
 * @param cursor - API 또는 Server Action으로 전달된 불투명 커서
 * @param expectedSort - 요청에 사용된 현재 정렬
 * @returns 검증된 DB 비교값 또는 잘못된 커서이면 null
 */
export function decodeRecordingCursor(
  cursor: string | null | undefined,
  expectedSort: RecordingSort
): DecodedRecordingCursor | null {
  if (!cursor || cursor.length > MAX_CURSOR_LENGTH) return null;

  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) return null;

    const decoded = Buffer.from(cursor, "base64url");
    if (decoded.toString("base64url") !== cursor) return null;

    const payload = JSON.parse(
      decoded.toString("utf8")
    ) as Partial<RecordingCursorPayload>;
    const readyAt = new Date(payload.r ?? "");

    if (
      payload.v !== CURSOR_VERSION ||
      payload.s !== expectedSort ||
      typeof payload.r !== "string" ||
      Number.isNaN(readyAt.getTime()) ||
      !Number.isSafeInteger(payload.i) ||
      Number(payload.i) <= 0 ||
      !Number.isSafeInteger(payload.w) ||
      Number(payload.w) < 0
    ) {
      return null;
    }

    return {
      sort: payload.s,
      readyAt,
      id: Number(payload.i),
      views: Number(payload.w),
    };
  } catch {
    return null;
  }
}
