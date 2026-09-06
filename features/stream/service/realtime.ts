/**
 * File Name : features/stream/service/realtime.ts
 * Description : 서버 사이드 방송 상태 private 브로드캐스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.14  임도헌   Created
 * 2026.01.18  임도헌   Modifeid  확장자 변경 (tsx->ts)
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 * 2026.01.23  임도헌   Moved     lib/stream/serverBroadcast -> service/realtime
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.08.21  임도헌   Modified  실시간 상태 payload에서 원본 provider UID를 제거하고 Broadcast PK 사용
 * 2026.08.21  임도헌   Modified  서버 secret 발신과 식별자-only private payload로 전환
 */

import "server-only";
import { realtimeServer } from "@/features/realtime/service/broadcast";
import { LIVE_STATUS_REALTIME_TOPIC } from "@/features/realtime/topics";

/**
 * 상태 값 자체는 브로드캐스트하지 않고 변경된 방송 ID만 알려준다.
 * 클라이언트는 이벤트 수신 후 서버 데이터를 다시 조회해 최종 상태를 결정한다.
 */
export async function sendLiveStatusFromServer({
  broadcastId,
}: {
  broadcastId: number;
}) {
  await realtimeServer.channel(LIVE_STATUS_REALTIME_TOPIC).send({
    type: "broadcast",
    event: "status",
    payload: { broadcastId },
  });
}
