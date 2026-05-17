/**
 * File Name : features/stream/utils/access.ts
 * Description : 방송 접근/상태 판별 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   types.ts에 섞여 있던 접근 메시지와 상태 판별 헬퍼 분리
 */

import { STREAM_VISIBILITY, VOD_STATUS } from "@/features/stream/constants";
import type {
  StreamVisibility,
  UnlockErrorCode,
  VodStatus,
} from "@/features/stream/types";

/** 잠금 해제 실패 코드별 사용자 메시지 */
export const unlockErrorMessage: Record<UnlockErrorCode, string> = {
  NOT_LOGGED_IN: "로그인이 필요합니다.",
  STREAM_NOT_FOUND: "스트림을 찾을 수 없습니다.",
  NOT_PRIVATE_STREAM: "비공개 스트림이 아닙니다.",
  NO_PASSWORD_SET: "비밀번호가 설정되지 않았습니다.",
  INVALID_PASSWORD: "비밀번호가 올바르지 않습니다.",
  BAD_REQUEST: "요청이 올바르지 않습니다.",
  MISSING_PASSWORD: "비밀번호를 입력해주세요.",
  INTERNAL_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

/** 비공개 방송 여부 판별 */
export const isPrivateVisibility = (visibility: StreamVisibility) =>
  visibility === STREAM_VISIBILITY.PRIVATE;

/** 팔로워 전용 방송 여부 판별 */
export const isFollowersVisibility = (visibility: StreamVisibility) =>
  visibility === STREAM_VISIBILITY.FOLLOWERS;

/** 시청 가능한 준비 완료 VOD 여부 판별 */
export const isVodReady = (status: VodStatus) => status === VOD_STATUS.READY;
