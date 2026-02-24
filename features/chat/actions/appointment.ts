/**
 * File Name : features/chat/actions/appointment.ts
 * Description : 약속 관련 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.16  임도헌   Created   약속 제안/수락/취소 액션
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  proposeAppointment,
  acceptAppointment,
  cancelAppointment,
} from "@/features/chat/service/appointment";
import type { LocationData } from "@/features/map/types";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage } from "@/features/chat/types";

/**
 * 약속 제안 Action
 * @returns {Promise<ServiceResult<ChatMessage>>} 성공 시 생성된 메시지 반환
 */
export async function proposeAppointmentAction(
  chatRoomId: string,
  data: { meetDate: Date; location: LocationData }
): Promise<ServiceResult<ChatMessage>> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await proposeAppointment(session.id, chatRoomId, data);

  // 제안 시 채팅방 목록의 lastMessage가 갱신되어야 하므로 캐시 무효화
  if (result.success) {
    revalidateTag(T.CHAT_ROOMS_ID(session.id));
    revalidateTag(T.CHAT_ROOMS());
  }
  return result;
}

export async function acceptAppointmentAction(
  appointmentId: number
): Promise<
  ServiceResult<{ productId: number; sellerId: number; buyerId: number }>
> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await acceptAppointment(session.id, appointmentId);

  if (result.success && result.data) {
    const { productId, sellerId, buyerId } = result.data;

    revalidateTag(T.PRODUCT_DETAIL_ID(productId)); // 상품 상세 갱신
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", sellerId)); // 판매자 판매중 목록 갱신
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("RESERVED", sellerId)); // 판매자 예약중 목록 갱신
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(sellerId)); // 판매자 탭 카운트 갱신

    // 구매자의 구매 목록도 필요하다면 갱신
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("PURCHASED", buyerId));
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(buyerId));

    // 약속 수락 시 시스템 메시지가 생성되므로 채팅방 목록도 갱신
    revalidateTag(T.CHAT_ROOMS_ID(session.id));

    // 메인 피드(항구)의 상품 상태(예약중 뱃지)를 즉시 갱신
    revalidateTag(T.PRODUCT_LIST());
  }

  return result;
}

export async function cancelAppointmentAction(
  appointmentId: number
): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await cancelAppointment(session.id, appointmentId);

  // 취소/거절 시에도 채팅방 목록 상태 갱신
  if (result.success) {
    revalidateTag(T.CHAT_ROOMS_ID(session.id));
    revalidateTag(T.CHAT_ROOMS());
  }
  return result;
}
