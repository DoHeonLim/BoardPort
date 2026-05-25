/**
 * File Name : features/chat/utils/appointmentTrade.ts
 * Description : 약속 제안/수락 전 상태 가드와 거래 참여자 산정 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   약속 수락 회귀 테스트를 위한 순수 도메인 규칙 분리
 * 2026.05.25  임도헌   Modified  약속 제안 시간/거래 가능 상태/상대방 식별 규칙 추가
 */

export type AppointmentGuardStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELED";

interface AppointmentAcceptanceGuardInput {
  requesterId: number;
  proposerId: number;
  receiverId: number;
  roomUserIds: number[];
  status: AppointmentGuardStatus;
  meetDate: Date;
  now?: Date;
}

interface AppointmentTradePartiesInput {
  sellerId: number;
  proposerId: number;
  receiverId: number;
}

interface AppointmentProposalTimeGuardInput {
  meetDate: Date;
  now?: Date;
  graceMs?: number;
}

interface ProductTradeAvailabilityInput {
  purchaseUserId?: number | null;
  reservationUserId?: number | null;
}

const DEFAULT_PROPOSAL_GRACE_MS = 5 * 60 * 1000;

/**
 * 약속 제안 시간이 유효한지 검사합니다.
 */
export function getAppointmentProposalTimeError({
  meetDate,
  now = new Date(),
  graceMs = DEFAULT_PROPOSAL_GRACE_MS,
}: AppointmentProposalTimeGuardInput): string | null {
  const meetTime = new Date(meetDate).getTime();

  if (Number.isNaN(meetTime)) return "유효하지 않은 날짜 형식입니다.";

  if (meetTime < now.getTime() - graceMs) {
    return "과거 시간으로는 약속을 제안할 수 없습니다.";
  }

  return null;
}

/**
 * 상품이 약속 제안을 받을 수 있는 거래 상태인지 검사합니다.
 */
export function getProductTradeAvailabilityError({
  purchaseUserId,
  reservationUserId,
}: ProductTradeAvailabilityInput): string | null {
  if (purchaseUserId || reservationUserId) {
    return "이미 거래가 진행 중인 상품입니다.";
  }

  return null;
}

/**
 * 채팅방 참여자 목록에서 제안자 반대편 사용자를 찾습니다.
 */
export function resolveAppointmentReceiverId(
  roomUserIds: number[],
  proposerId: number
): number | null {
  return roomUserIds.find((id) => id !== proposerId) ?? null;
}

/**
 * 약속 수락 전에 DB 변경 없이 판단할 수 있는 상태/권한 조건을 검사합니다.
 */
export function getAppointmentAcceptanceGuardError({
  requesterId,
  proposerId,
  receiverId,
  roomUserIds,
  status,
  meetDate,
  now = new Date(),
}: AppointmentAcceptanceGuardInput): string | null {
  if (receiverId !== requesterId) return "수락 권한이 없습니다.";

  if (status !== "PENDING") return "이미 처리된 약속입니다.";

  const isProposerInRoom = roomUserIds.includes(proposerId);
  const isReceiverInRoom = roomUserIds.includes(requesterId);

  if (!isProposerInRoom || !isReceiverInRoom) {
    return "대화 참여자 중 일부가 채팅방을 나가 약속을 진행할 수 없습니다.";
  }

  if (meetDate < now) return "약속 시간이 이미 지났습니다.";

  return null;
}

/**
 * 상품 판매자와 약속 제안/수신자를 기준으로 실제 구매자를 산정합니다.
 */
export function resolveAppointmentTradeParties({
  sellerId,
  proposerId,
  receiverId,
}: AppointmentTradePartiesInput):
  | { sellerId: number; buyerId: number }
  | null {
  const buyerId = proposerId === sellerId ? receiverId : proposerId;

  if (buyerId === sellerId) return null;

  return { sellerId, buyerId };
}
