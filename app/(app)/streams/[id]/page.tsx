/**
 * File Name : app/(app)/streams/[id]/page.tsx
 * Description : 라이브 스트리밍 개별 페이지 (Broadcast 스키마 기준)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.11.12  임도헌   Created
 * 2024.11.12  임도헌   Modified   라이브 스트리밍 개별 페이지 추가
 * 2024.11.19  임도헌   Modified   캐싱 기능 추가
 * 2024.11.21  임도헌   Modified   Link를 StreamDetail로 옮김
 * 2024.11.23  임도헌   Modified   스트리밍 채팅방 컴포넌트 추가
 * 2024.12.12  임도헌   Modified   뒤로가기 버튼 추가
 * 2025.05.16  임도헌   Modified   스트리밍 상태 캐싱 최적화
 * 2025.08.14  임도헌   Modified   PRIVATE 비번 해제 상태(isPrivateUnlocked) 반영
 * 2025.08.23  임도헌   Modified   getSession/스트림 조회 병렬화, avatar 널 가드 보강
 * 2025.09.05  임도헌   Modified   dynamic="force-dynamic" 적용 — PRIVATE 언락/팔로우 직후 가드 최신화
 * 2025.09.09  임도헌   Modified   가드/채팅 로직 단순화
 * 2025.09.16  임도헌   Modified   Broadcast 스키마 반영, 캐시 태그 교체(broadcast-detail-*), 채팅방 조회/host 경로 수정
 * 2025.09.16  임도헌   Modified   네이밍 정리(checkBroadcastAccess/isBroadcastUnlocked), 캐시 태그 상수화
 * 2025.09.30  임도헌   Modified   데스크톱, 모바일 UI 변경
 * 2025.11.15  임도헌   Modified   layout으로 back버튼 이동
 * 2025.12.09  임도헌   Modified   403 리다이렉트 파라미터 정리
 * 2026.01.02  임도헌   Modified   상세 캐시 wrapper를 base + 태그 주입 방식으로 정리
 * 2026.01.03  임도헌   Modified   getSession() 후 유저 조회를 getUserInfo() → getUserInfoById(session.id)로 변경(중복 세션 조회 제거)
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 배경색 및 레이아웃 조정
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.02.04  임도헌   Modified  방송 상세 진입 시 차단 가드(checkBlockRelation) 추가
 * 2026.02.13  임도헌   Modified  generateMetadata 추가 및 캐시 함수 재사용
 * 2026.02.22  임도헌   Modified  라이브 채팅창에 기존 차단 목록(blockedIds) 주입
 * 2026.03.04  임도헌   Modified  StreamChatUIStoreProvider 적용으로 스트림 채팅 UI 상태를 이벤트 버스에서 Zustand로 전환
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.06  임도헌   Modified  데스크톱에서도 모바일과 동일한 중앙 정렬 단일 컬럼 흐름으로 레이아웃을 통일
 * 2026.03.18  임도헌   Modified  returnTo 기본 경로를 /streams로 고정하고 로그인/권한 가드 복귀 흐름을 정리
 * 2026.03.21  임도헌   Modified  full-width 스트림 셸, 우측 sticky 채팅 레일, 모바일 인라인 채팅 섹션 구조로 상세 레이아웃을 재정리
 * 2026.03.21  임도헌   Modified  방송 정보 카드 팔로우 CTA를 위해 소유자 프로필 초기 상태를 함께 주입
 * 2026.03.24  임도헌   Modified  스트림 상세 전용 Client Shell로 채팅 열림 상태를 로컬 관리하도록 단순화
 * 2026.03.27  임도헌   Modified  라이브 상세 본문은 최신 상태를 직접 조회하도록 바꿔 CONNECTED/ENDED 오버레이 stale 현상 방지
 * 2026.04.03  임도헌   Modified  전역 차단과 방송 전용 강제 퇴장을 구분하기 위해 StreamBlockGuard에 방송 ID를 함께 전달
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 초기 상태를 상세 클라이언트 셸에 함께 주입
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/[id]/page.tsx 에서 app/(app)/streams/[id]/page.tsx 로 변경 (라우트 그룹 개편)
*/

export const dynamic = "force-dynamic"; // 개인화 및 실시간 상태 반영

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { getUserInfoById, getUserProfile } from "@/features/user/service/profile";
import type { StreamVisibility } from "@/features/stream/types";
import StreamDetailClientShell from "@/features/stream/components/StreamDetailClientShell";
import StreamBlockGuard from "@/features/stream/components/StreamBlockGuard";
import {
  getBroadcastDetail,
  getCachedBroadcastDetail,
  StreamDetailDTO,
} from "@/features/stream/service/detail";
import { isBroadcastUnlockedFromSession } from "@/features/stream/utils/session";
import { checkBroadcastAccess } from "@/features/stream/service/access";
import {
  getMutedStreamViewerIds,
  getInitialStreamMessages,
  getStreamChatRoom,
  isStreamViewerMuted,
} from "@/features/stream/service/chat";
import {
  checkBlockRelation,
  getBlockedUserIds,
} from "@/features/user/service/block";

// 메타데이터 생성
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { title: "방송을 찾을 수 없음" };
  }
  const stream = await getCachedBroadcastDetail(id);

  if (!stream) {
    return { title: "방송을 찾을 수 없음" };
  }

  const title = `${stream.title} - ${stream.user.username}`;
  const desc = stream.description?.slice(0, 100) || "보드포트 라이브 스트리밍";

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
    },
  };
}

/**
 * 라이브 방송 상세 페이지
 *
 * [기능]
 * - 로그인 세션 확인 및 비인가 사용자 리다이렉트 처리
 * - 방송 정보 서버 캐시 조회 및 판매자-조회자 간 양방향 차단 관계 검증
 * - 방송 공개 설정(PRIVATE, FOLLOWERS)에 따른 세션 언락 상태 및 팔로우 권한 검증
 * - 채팅방 정보, 초기 메시지, 차단 목록, 소유자 프로필을 함께 로드해 상세 UI 초기 상태 구성
 * - returnTo 미지정 시 스트림 목록(`/streams`) 복귀 경로 사용
 *
 * @param {Object} params - URL 파라미터 (id: 방송 ID)
 * @param {Object} searchParams - URL 쿼리 파라미터 (returnTo: 복귀 경로)
 */
export default async function StreamDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { returnTo?: string };
}) {
  const broadcastId = Number(params.id);
  if (!Number.isFinite(broadcastId) || broadcastId <= 0) notFound();
  // 라이브 상세 복귀 기본 경로 고정
  const returnTo = sanitizeCallbackUrl(searchParams?.returnTo ?? "/streams");
  const detailHref = `/streams/${broadcastId}?returnTo=${encodeURIComponent(
    returnTo
  )}`;

  const [session, fetched] = await Promise.all([
    getSession(),
    getBroadcastDetail(broadcastId),
  ]);

  if (!session?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(detailHref)}`);
  }
  if (!fetched) notFound();

  const initialBroadcast = fetched as StreamDetailDTO;
  const ownerId = initialBroadcast.userId ?? null;
  // 1. 차단 관계 확인 가드
  // 소유자가 본인이 아닐 때, 양방향 차단 여부(내가 차단했거나, 나를 차단했거나)를 검사
  if (session.id !== ownerId) {
    const isBlocked = await checkBlockRelation(session.id, ownerId);
    if (isBlocked) {
      redirect(
        `/403?reason=BLOCKED` +
          `&username=${encodeURIComponent(initialBroadcast.user.username)}` +
          `&callbackUrl=${encodeURIComponent(detailHref)}`
      );
    }
  }

  // 2. 기존 권한 체크 (PRIVATE / FOLLOWERS)
  const isOwner = session.id === ownerId;
  if (!isOwner) {
    const isUnlocked = isBroadcastUnlockedFromSession(session, broadcastId);
    const guard = await checkBroadcastAccess(
      {
        userId: ownerId,
        visibility: initialBroadcast.visibility as StreamVisibility,
      },
      session.id,
      { isPrivateUnlocked: isUnlocked }
    );

    if (!guard.allowed) {
      redirect(
        `/403?reason=${guard.reason}` +
          `&username=${encodeURIComponent(initialBroadcast.user.username)}` +
          `&callbackUrl=${encodeURIComponent(detailHref)}` +
          `&sid=${broadcastId}&uid=${ownerId}`
      );
    }
  }

  // 3. 채팅방 및 유저 정보 조회
  const [streamChatRoom, user, ownerProfile] = await Promise.all([
    getStreamChatRoom(broadcastId),
    getUserInfoById(session.id),
    getUserProfile(ownerId, session.id),
  ]);
  if (!streamChatRoom || !user || !ownerProfile) notFound();

  const [initialStreamMessage, initialMutedUserIds, initiallyMuted] =
    await Promise.all([
      getInitialStreamMessages(streamChatRoom.id),
      isOwner ? getMutedStreamViewerIds(broadcastId) : Promise.resolve([]),
      isOwner
        ? Promise.resolve(false)
        : isStreamViewerMuted(broadcastId, session.id),
    ]);
  // 현재 접속한 유저가 과거에 차단했던 유저 목록을 DB에서 가져옴(기존 채팅에서 차단한 유저의 메세지 지우기 위해서)
  const blockedIds = session.id ? await getBlockedUserIds(session.id) : [];

  return (
    <>
      {/* 실시간 차단 감지 가드 추가 */}
      <StreamBlockGuard
        viewerId={session?.id ?? null}
        ownerId={ownerId}
        ownerUsername={initialBroadcast.user.username}
        streamId={broadcastId}
      />

      <StreamDetailClientShell
        stream={initialBroadcast}
        viewerId={session.id}
        streamId={broadcastId}
        ownerProfile={ownerProfile}
        returnTo={returnTo}
        isOwner={isOwner}
        initialStreamMessage={initialStreamMessage}
        streamChatRoomId={streamChatRoom.id}
        streamChatRoomhost={streamChatRoom.broadcast.liveInput.userId}
        username={user.username}
        blockedUserIds={blockedIds}
        mutedUserIds={initialMutedUserIds}
        initiallyMuted={initiallyMuted}
      />
    </>
  );
}

