/**
 * File Name : features/chat/constants.ts
 * Description : 채팅 도메인 상수
 * Author : 임도헌
 *
 * History
 * 2026.01.24  임도헌   Created   상수 정의 (MESSAGE_LOAD_LIMIT 등)
 * 2026.04.01  임도헌   Modified  메시지 반응 상수 및 실시간 이벤트(message_reaction) 추가
 * 2026.04.02  임도헌   Modified  채팅 상수 설명 보강
 * 2026.04.04  임도헌   Modified  새 채팅방 등장 시 목록 재동기화를 위한 rooms_refresh 이벤트 추가
 */

/** 채팅 목록/메시지 페이지당 로드 개수 */
export const MESSAGE_LOAD_LIMIT = 20;

/** Supabase Realtime 이벤트 이름 */
export const CHAT_EVENT = {
  MESSAGE: "message", // 새 메시지 수신
  MESSAGE_READ: "message_read", // 메시지 읽음 처리
  MESSAGE_DELETED: "message_deleted", // 메시지 삭제 상태 반영
  MESSAGE_REACTION: "message_reaction", // 메시지 반응 상태 반영
  ROOMS_REFRESH: "rooms_refresh", // 채팅방 목록 재동기화
} as const;

/** 메시지 반응 키별 표시 메타 */
export const CHAT_MESSAGE_REACTION_META = {
  LIKE: { emoji: "👍", label: "좋아요" },
  LOVE: { emoji: "❤️", label: "좋아해요" },
  LAUGH: { emoji: "😂", label: "웃겨요" },
  WOW: { emoji: "😮", label: "놀라워요" },
  SAD: { emoji: "😢", label: "슬퍼요" },
} as const;

/** 지원하는 메시지 반응 키 */
export type ChatMessageReactionKey =
  keyof typeof CHAT_MESSAGE_REACTION_META;

/** 메시지 반응 키 배열 */
export const CHAT_MESSAGE_REACTION_KEYS = Object.keys(
  CHAT_MESSAGE_REACTION_META
) as ChatMessageReactionKey[];

/** 채팅 메시지 조회 공통 include */
export const MESSAGE_INCLUDE = {
  user: { select: { id: true, username: true, avatar: true } },
  appointment: true, // 약속 정보 포함
  reactions: {
    select: { reactionKey: true, userId: true },
  },
};
