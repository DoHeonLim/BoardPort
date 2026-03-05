/**
 * File Name : features/chat/hooks/useSendMessageMutation.ts
 * Description : 채팅 메시지 전송 전용 Mutation 훅 (CQRS 분리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.03  임도헌   Created   ChatMessagesList에서 메시지 전송 로직 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import { sendMessageAction } from "@/features/chat/actions/messages";

interface SendMessageArgs {
  text?: string | null;
  imageUrl?: string | null;
}

/**
 * 채팅 메시지 전송을 처리하는 훅
 *
 * [기능]
 * 1. 서버 액션(`sendMessageAction`)을 호출하여 DB 저장 및 브로드캐스트를 수행
 * 2. 성공 시 생성된 메시지 객체 및 수신자 정보를 반환
 *
 * @param {string} chatRoomId - 메시지를 전송할 채팅방 ID
 */
export function useSendMessageMutation(chatRoomId: string) {
  return useMutation({
    mutationFn: async ({ text, imageUrl }: SendMessageArgs) => {
      const res = await sendMessageAction(chatRoomId, text, imageUrl);
      // Rate Limit(도배 방지) 또는 차단 등의 에러 처리
      if (!res || !res.success) {
        throw new Error(res?.error || "메시지를 전송할 수 없습니다.");
      }
      return res.data;
    },
  });
}
