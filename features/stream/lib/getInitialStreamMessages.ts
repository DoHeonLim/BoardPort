/**
 * File Name : features/stream/lib/getInitialStreamMessages.ts
 * Description : 스트리밍 채팅방의 초기 메시지 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   스트리밍 메시지 초기화 조회 로직 분리
 * 2025.08.23  임도헌   Modified  최근 20개만 조회 후 ASC 정렬로 반환(타임스탬프 동일 시 id로 보조정렬)
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.19  임도헌   Moved     features/chat/lib -> features/stream/lib
 */
import "server-only";
import db from "@/lib/db";
import { StreamChatMessage } from "@/types/chat";

/**
 * getInitialStreamMessages
 * - 최근 N개를 시간 역순으로 가져온 뒤, 클라 표시용으로 정순 변환하는 패턴을 권장
 * - 필요 시 cursor/pagination 쉽게 확장
 */
const DEFAULT_TAKE = 20;

export const getInitialStreamMessages = async (
  streamChatRoomId: number,
  take: number = DEFAULT_TAKE
): Promise<StreamChatMessage[]> => {
  // 최근 N개를 DESC로 가져와서
  const rows = await db.streamMessage.findMany({
    where: { streamChatRoomId },
    orderBy: [
      { created_at: "desc" }, // 최신 우선
      { id: "desc" }, // 동일 타임스탬프 보조 정렬
    ],
    take,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  // ASC로 반환(오래된 → 최신)
  return rows.reverse();
};
