/**
 * File Name : features/chat/actions/appointment.ts
 * Description : 약속 관련 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.16  임도헌   Created   약속 제안/수락/취소 액션
 * 2026.03.04  임도헌   Modified  주석 최신화
 * 2026.03.05  임도헌   Modified  Action 내 `revalidateTag` 부수 효과(Side Effect) 완전 제거 및 클라이언트 Mutation 훅으로 상태 갱신 위임
 */
"use server";

import getSession from "@/lib/session";
import {
  proposeAppointment,
  acceptAppointment,
  cancelAppointment,
} from "@/features/chat/service/appointment";
import type { LocationData } from "@/features/map/types";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage } from "@/features/chat/types";

/**
 * 채팅방 약속 제안 Server Action
 *
 * [데이터 가공 및 검증 로직]
 * - 로그인 세션 확인 후 Service 계층을 호출하여 신규 약속 데이터 영속화
 * - 성공 시 낙관적 업데이트를 위한 메시지(ChatMessage) 객체 반환
 *
 * @param {string} chatRoomId - 약속을 제안할 채팅방 ID
 * @param {Object} data - 약속 시간 및 위치(위경도, 장소명) 정보
 * @returns {Promise<ServiceResult<ChatMessage>>} 생성된 약속이 포함된 메시지 결과
 */
export async function proposeAppointmentAction(
  chatRoomId: string,
  data: { meetDate: Date; location: LocationData }
): Promise<ServiceResult<ChatMessage>> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await proposeAppointment(session.id, chatRoomId, data);

  return result;
}

/**
 * 채팅방 약속 수락 Server Action
 *
 * [데이터 가공 및 상태 제어 로직]
 * - 로그인 세션 확인 후 Service 계층을 호출하여 약속 상태를 수락(ACCEPTED)으로 변경
 * - 상품 예약 상태 연동 및 타 채팅방 대기 약속 일괄 취소 처리 위임
 *
 * @param {number} appointmentId - 수락할 약속 ID
 * @returns {Promise<ServiceResult>} 상품 식별자와 구매/판매자 정보 반환
 */
export async function acceptAppointmentAction(
  appointmentId: number
): Promise<
  ServiceResult<{ productId: number; sellerId: number; buyerId: number }>
> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await acceptAppointment(session.id, appointmentId);

  return result;
}

/**
 * 채팅방 약속 취소/거절 Server Action
 *
 * [데이터 가공 및 상태 제어 로직]
 * - 로그인 세션 확인 후 제안자/수신자 여부에 따라 약속 상태를 취소 또는 거절로 변경
 * - 히스토리 보존을 위한 시스템 메시지 생성 유도
 *
 * @param {number} appointmentId - 취소/거절할 약속 ID
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function cancelAppointmentAction(
  appointmentId: number
): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await cancelAppointment(session.id, appointmentId);

  return result;
}
