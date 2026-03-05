/**
 * File Name : features/chat/hooks/useProposeAppointmentMutation.ts
 * Description : 채팅방 내 약속 제안 전용 Mutation 훅 (CQRS 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   ChatMessagesList에서 약속 제안 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import { proposeAppointmentAction } from "@/features/chat/actions/appointment";
import type { LocationData } from "@/features/map/types";

interface ProposeAppointmentArgs {
  date: Date;
  location: LocationData;
}

/**
 * 채팅방 약속(Appointment) 제안을 처리하는 훅
 *
 * [기능]
 * 1. 서버 액션(`proposeAppointmentAction`)을 호출하여 약속 제안 상태를 DB에 저장
 * 2. 성공 시 생성된 약속이 포함된 메시지 객체를 반환
 *
 * @param {string} chatRoomId - 약속을 제안할 채팅방 ID
 */
export function useProposeAppointmentMutation(chatRoomId: string) {
  return useMutation({
    mutationFn: async ({ date, location }: ProposeAppointmentArgs) => {
      const res = await proposeAppointmentAction(chatRoomId, {
        meetDate: date,
        location,
      });
      if (!res || !res.success) {
        throw new Error(res?.error || "약속을 제안할 수 없습니다.");
      }
      return res.data;
    },
  });
}
