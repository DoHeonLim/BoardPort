/**
 * File Name : app/(app)/(tabs)/chat/loading.tsx
 * Description : 채팅 목록 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.12  임도헌   Created   [UX] 채팅 목록 스켈레톤 추가
 * 2026.03.12  임도헌   Modified  flat 헤더와 검색바가 반영된 현재 채팅 목록 구조에 맞춰 스켈레톤 정리
 * 2026.03.28  임도헌   Modified  헤더/검색바 배치를 실채팅 목록과 동일한 구조로 재정렬
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/chat/loading.tsx 에서 app/(app)/(tabs)/chat/loading.tsx 로 변경 (라우트 그룹 개편)
 */

import ChatListSkeleton from "@/features/chat/components/ChatListSkeleton";

export default function Loading() {
  return <ChatListSkeleton />;
}
