/**
 * File Name : app/streams/[id]/recording/page.tsx
 * Description : 라이브 스트리밍 녹화본 페이지 (Broadcast × VodAsset)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.19  임도헌   Created
 * 2024.11.19  임도헌   Modified  라이브 스트리밍 녹화본 페이지 추가
 * 2024.11.21  임도헌   Modified  console.log 삭제
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.12  임도헌   Modified  녹화본 생성 시간 표시 변경
 * 2025.08.04  임도헌   Modified  댓글 UI 추가
 * 2025.08.09  임도헌   Modified  접근 가드(403) 적용
 * 2025.09.05  임도헌   Modified  dynamic="force-dynamic" 적용 — 언락/팔로우 직후 녹화 페이지 접근 가드의 캐시 오판 방지
 * 2025.09.10  임도헌   Modified  로그인 가드 제거(미들웨어 신뢰), 변수명/타이핑/동시성 소폭 개선
 * 2025.09.20  임도헌   Modified  Broadcast/VodAsset 스키마로 전면 전환 (좋아요/댓글을 VodAsset 단위로)
 * 2025.09.20  임도헌   Modified  라우트 파라미터를 vodId로 고정
 * 2025.11.26  임도헌   Modified  RecordingTopbar 도입(뒤로가기/유저/카테고리 상단 고정)
 * 2026.01.03  임도헌   Modified  PRIVATE 언락 체크에서 session 중복 조회 제거(isBroadcastUnlockedFromSession)
 * 2026.01.03  임도헌   Modified  getVodDetail 2회 호출 제거(조회수 증가는 표시값만 보정)
 * 2026.01.03  임도헌   Modified  ViewThrottle 기반 3분 쿨다운 결과를 didIncrement로 반영(쿨다운 시 +1 보정 금지)
 * 2026.01.04  임도헌   Modified  VOD(Recording) 상세는 force-dynamic 유지 — PRIVATE 언락/팔로우 직후 접근 가드의 캐시 오판 방지
 * 2026.01.04  임도헌   Modified  incrementVodViews wrapper 제거 → lib/views/incrementViews 직접 호출(단일 진입점)
 * 2026.01.04  임도헌   Modified  getVodDetail은 접근 제어 정확성 우선으로 nextCache 비적용(조회수는 didIncrement 기반 표시값만 보정)
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 배경색 및 레이아웃 정리
 * 2026.01.23  임도헌   Modified  Action 의존 제거 -> Service(like status) 직접 호출
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.02.03  임도헌   Modified  순서 보장(Sequencing) 패턴 적용: 조회수 증가 후 데이터 병렬 로드
 * 2026.02.23  임도헌   Modified  didIncrement 수동 보정 레거시 제거 및 서버 SSOT 조회수 패턴으로 전 도메인 통일
 * 2026.03.03  임도헌   Modified  TanStack Query HydrationBoundary 적용 및 녹화본 댓글 데이터 Prefetch 로직 추가
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import getSession from "@/lib/session";
import RecordingTopbar from "@/features/stream/components/recording/RecordingTopbar";
import RecordingDetail from "@/features/stream/components/recording/recordingDetail";
import RecordingComment from "@/features/stream/components/recording/recordingComment";
import RecordingDeleteButton from "@/features/stream/components/recording/recordingDetail/RecordingDeleteButton";
import { checkBroadcastAccess } from "@/features/stream/service/access";
import { isBroadcastUnlockedFromSession } from "@/features/stream/utils/session";
import { getVodDetail } from "@/features/stream/service/detail";
import { getRecordingLikeStatus } from "@/features/stream/service/like";
import { incrementViews } from "@/features/common/service/view";
import { checkBlockRelation } from "@/features/user/service/block";
import { getRecordingCommentsListAction } from "@/features/stream/actions/comments";
import type { StreamVisibility } from "@/features/stream/types";

/**
 * 녹화본 상세 페이지 (VOD)
 *
 * [기능]
 * - 로그인 세션 검증 및 비인가 사용자 리다이렉트 처리
 * - 쿨다운 정책이 적용된 조회수 증가 로직 서버 사이드 선행 처리
 * - 녹화본 상세 정보 및 좋아요 상태의 서버 사이드 병렬 로드 적용
 * - 양방향 차단 가드 확인 및 방송 접근 권한(PRIVATE, FOLLOWERS) 세션 검증 처리
 * - TanStack Query를 활용한 VOD 댓글 목록 서버 프리패치(Prefetch) 및 HydrationBoundary 적용
 */
export default async function RecordingVodPage({
  params,
}: {
  params: { id: string };
}) {
  const vodId = Number(params.id);
  if (!Number.isFinite(vodId) || vodId <= 0) return notFound();

  // 1. 세션 및 유저 확인
  const session = await getSession();
  const viewerId = session?.id ?? null;

  if (!viewerId) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/streams/${vodId}/recording`)}`
    );
  }

  // 2. 조회수 증가 및 무효화 선행
  try {
    await incrementViews({
      target: "VOD",
      targetId: vodId,
      viewerId,
    });
  } catch (e) {
    console.warn("[RecordingPage] incrementViews failed:", e);
  }

  // 3. QueryClient 초기화 및 데이터 병렬 로드 수행
  const queryClient = getQueryClient();

  const [base, like] = await Promise.all([
    getVodDetail(vodId),
    getRecordingLikeStatus(vodId, viewerId),
    // 서버 환경에서 댓글 첫 페이지를 미리 가져와 캐시에 저장 (Prefetch)
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.streams.vodComments(vodId),
      queryFn: () => getRecordingCommentsListAction(vodId), // Limit 10 (기본값)
      initialPageParam: undefined as number | undefined,
    }),
  ]);

  if (!base) return notFound();

  const owner = base.broadcast.owner;
  const isOwner = viewerId === owner.id;

  // 3. 차단 관계 확인 가드
  // 소유자가 본인이 아닐 때, 양방향 차단을 검증하여 접근을 제한
  if (!isOwner) {
    const isBlocked = await checkBlockRelation(viewerId, owner.id);
    if (isBlocked) {
      redirect(
        `/403?reason=BLOCKED&username=${encodeURIComponent(owner.username)}&callbackUrl=${encodeURIComponent(`/streams/${vodId}/recording`)}`
      );
    }
    // 4. 접근 권한 체크 (PRIVATE / FOLLOWERS)
    const isUnlocked = isBroadcastUnlockedFromSession(
      session,
      base.broadcast.id
    );
    const guard = await checkBroadcastAccess(
      {
        userId: owner.id,
        visibility: base.broadcast.visibility as StreamVisibility,
      },
      viewerId,
      { isPrivateUnlocked: isUnlocked }
    );

    if (!guard.allowed) {
      redirect(
        `/403?reason=${guard.reason}&username=${encodeURIComponent(owner.username)}&callbackUrl=${encodeURIComponent(`/streams/${vodId}/recording`)}&sid=${base.broadcast.id}&uid=${owner.id}`
      );
    }
  }

  // 5. 데이터 가공
  const created = new Date((base.readyAt ?? base.createdAt) as Date);
  const durationSec = Math.round(base.durationSec ?? 0);
  const category = base.broadcast.category ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors">
      {/* 상단바: 뒤로가기 및 작성자 정보 */}
      <RecordingTopbar
        broadcastId={base.broadcast.id}
        ownerId={owner.id}
        username={owner.username}
        avatar={owner.avatar}
        isOwner={isOwner}
        backHref="/streams"
        categoryLabel={category?.kor_name ?? null}
        categoryIcon={category?.icon ?? null}
      />

      <main className="flex-1 flex flex-col items-center gap-6 pb-20 px-page-x py-6 w-full max-w-mobile mx-auto">
        {/* 비디오 플레이어 및 메타 정보 */}
        <RecordingDetail
          broadcast={base.broadcast}
          vodId={vodId}
          uid={base.uid}
          duration={durationSec}
          created={created}
          isLiked={like.isLiked}
          likeCount={like.likeCount}
          commentCount={base.counts.comments}
          viewCount={base.views}
        />

        {/* 소유자 전용: 삭제 버튼 */}
        {isOwner && (
          <div className="w-full">
            <RecordingDeleteButton
              broadcastId={base.broadcast.id}
              liveInputUid={base.broadcast.stream_id}
              username={owner.username}
            />
          </div>
        )}

        {/* 댓글 섹션 */}
        <div className="w-full pt-4 border-t border-border">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="text-xl">💬</span> 댓글
          </h3>
          {/* 직렬화된 캐시 상태(dehydratedState)를 하위 컴포넌트로 전송 */}
          <HydrationBoundary state={dehydrate(queryClient)}>
            <RecordingComment vodId={vodId} currentUserId={viewerId} />
          </HydrationBoundary>
        </div>
      </main>
    </div>
  );
}
