/**
 * File Name : app/api/chats/unread-count/route.ts
 * Description : 현재 로그인한 유저의 채팅 미읽음 수 조회 API
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.18  임도헌   Created   TabBar 채팅 뱃지 queryFn에서 Server Action을 직접 호출하지 않도록 미읽음 수 조회 API 추가
 */

import { NextResponse } from "next/server";
import getSession from "@/lib/session";
import { getUnreadChatMessageCount } from "@/features/chat/service/room";

/**
 * 현재 로그인 유저의 전체 채팅 미읽음 수 반환
 * Client Component queryFn은 이 Route Handler를 fetch해 Server Action 초기 렌더 호출 오류를 피하도록 구성
 *
 * @returns {Promise<NextResponse<{ count: number }>>} 채팅 미읽음 수 응답
 */
export async function GET() {
  const session = await getSession();
  if (!session?.id) {
    return NextResponse.json({ count: 0 });
  }

  const count = await getUnreadChatMessageCount(session.id);
  return NextResponse.json({ count });
}
