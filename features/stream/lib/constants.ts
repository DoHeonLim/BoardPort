/**
 * File Name : features/stream/lib/constants.ts
 * Description : 공통 스트리밍 select 쿼리 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.13  임도헌   Created
 * 2025.08.24  임도헌   Modified  password 제거(민감 필드)
 * 2026.01.19  임도헌   Moved     lib/constants -> features/stream/lib
 * 2026.01.19  임도헌   Renamed   streamSelect -> constants 이름 변경
 */
export const STREAM_SELECT = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  status: true,
  visibility: true,
  started_at: true,
  ended_at: true,
  user: { select: { id: true, username: true, avatar: true } },
  category: { select: { id: true, kor_name: true, icon: true } },
  tags: { select: { name: true } },
} as const;
