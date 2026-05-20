/**
 * File Name : app/api/chats/rooms/route.ts
 * Description : 현재 로그인한 유저의 채팅방 목록 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.18  임도헌   Created   Client queryFn에서 채팅 목록 Server Action을 직접 호출하지 않도록 조회 API 추가
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { getChatRooms } from "@/features/chat/service/room";

/**
 * 현재 로그인 유저의 채팅방 목록 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @returns {Promise<NextResponse>} 차단 필터링과 미읽음 수가 반영된 채팅방 목록 응답
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json([]);
  }

  const rooms = await getChatRooms(session.id);
  return NextResponse.json(rooms);
}
