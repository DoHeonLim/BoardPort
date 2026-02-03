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
 */
/**
 * NOTE
 * - 이 페이지는 접근 가드(팔로우/PRIVATE 언락)에 강하게 의존한다.
 * - 따라서 cache/ISR로 인해 guard 판단이 stale 되는 것을 막기 위해 force-dynamic을 유지한다.
 * - getVodDetail은 nextCache로 감싸지 않고(=비캐시) 요청 시점의 최신 상태로 가드를 평가한다.
 * - 조회수는 ViewThrottle(3분) 기반으로 incrementViews에서 처리하고, didIncrement=true일 때만 화면 표시값을 +1 보정한다.
 */
export const dynamic = "force-dynamic"; // 접근 가드 및 조회수 증가 로직 포함

import { notFound, redirect } from "next/navigation";
import getSession from "@/lib/session";

import RecordingTopbar from "@/features/stream/components/recording/RecordingTopbar";
import RecordingDetail from "@/features/stream/components/recording/recordingDetail";
import RecordingComment from "@/features/stream/components/recording/recordingComment";
import RecordingDeleteButton from "@/features/stream/components/recording/recordingDetail/RecordingDeleteButton";

// Services
import { checkBroadcastAccess } from "@/features/stream/service/access";
import { isBroadcastUnlockedFromSession } from "@/features/stream/utils/session";
import { getVodDetail } from "@/features/stream/service/detail";
import { getRecordingLikeStatus } from "@/features/stream/service/like";
import { incrementViews } from "@/features/common/service/view";

/**
 * 녹화본 상세 페이지
 *
 * [기능]
 * 1. 로그인 세션을 확인합니다.
 * 2. VOD 상세 정보(방송, 소유자 포함)를 조회합니다.
 * 3. 원본 방송의 접근 권한(Private/Followers)을 검증합니다.
 *    - 권한이 없으면 `/403` 페이지로 리다이렉트합니다.
 * 4. 조회수를 증가시킵니다. (3분 쿨다운 적용)
 * 5. 좋아요 상태를 조회합니다.
 * 6. `RecordingDetail` 및 댓글 섹션을 렌더링합니다.
 *
 * @param {Object} params - URL 파라미터 (id: VOD ID)
 */
export default async function RecordingVodPage({
  params,
}: {
  params: { id: string };
}) {
  const vodId = Number(params.id);
  if (!Number.isFinite(vodId) || vodId <= 0) return notFound();

  const session = await getSession();
  if (!session?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/streams/${vodId}/recording`)}`
    );
  }
  const viewerId = session?.id ?? null;

  // 1. 상세 조회
  const base = await getVodDetail(vodId);
  if (!base) return notFound();

  const broadcastId = base.broadcast.id;
  const owner = base.broadcast.owner;
  const isOwner = viewerId === owner.id;

  // 2. 접근 가드
  if (!isOwner) {
    const isUnlocked = isBroadcastUnlockedFromSession(session, broadcastId);
    const guard = await checkBroadcastAccess(
      { userId: owner.id, visibility: base.broadcast.visibility },
      viewerId,
      { isPrivateUnlocked: isUnlocked }
    );
    if (!guard.allowed) {
      const callbackUrl = `/streams/${vodId}/recording`;
      redirect(
        `/403?reason=${guard.reason}` +
          `&username=${encodeURIComponent(owner.username)}` +
          `&callbackUrl=${encodeURIComponent(callbackUrl)}` +
          `&sid=${broadcastId}` +
          `&uid=${owner.id}`
      );
    }
  }

  // 3. 조회수 증가 (표시값 보정용 didIncrement 반환)
  let didIncrement = false;
  try {
    didIncrement = await incrementViews({
      target: "RECORDING",
      targetId: vodId,
      viewerId,
    });
  } catch (e) {
    console.warn("[incrementViews] failed:", e);
  }

  const vod = {
    ...base,
    views: didIncrement ? (base.views ?? 0) + 1 : base.views,
  };

  // 4. 좋아요 상태 조회
  const like = await getRecordingLikeStatus(vodId, viewerId);

  // 5. 렌더링 데이터 준비
  const created = new Date((vod.readyAt ?? vod.createdAt) as Date);
  const durationSec = Math.round(vod.durationSec ?? 0);
  const broadcastOwner = vod.broadcast.owner;
  const category = vod.broadcast.category ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background transition-colors">
      <RecordingTopbar
        backHref="/streams"
        username={broadcastOwner.username}
        avatar={broadcastOwner.avatar}
        categoryLabel={category?.kor_name ?? null}
        categoryIcon={category?.icon ?? null}
      />

      <main className="flex-1 flex flex-col items-center gap-6 pb-20 px-page-x py-6 w-full max-w-mobile mx-auto">
        <RecordingDetail
          broadcast={vod.broadcast}
          vodId={vodId}
          uid={vod.uid}
          duration={durationSec}
          created={created}
          isLiked={like.isLiked}
          likeCount={like.likeCount}
          commentCount={vod.counts.comments}
          viewCount={vod.views ?? 0}
        />

        {isOwner && (
          <div className="w-full">
            <RecordingDeleteButton
              broadcastId={vod.broadcast.id}
              liveInputUid={vod.broadcast.stream_id}
              username={vod.broadcast.owner.username}
            />
          </div>
        )}

        <div className="w-full pt-4 border-t border-border">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <span className="text-xl">💬</span> 댓글
          </h3>
          <RecordingComment vodId={vodId} currentUserId={session.id!} />
        </div>
      </main>
    </div>
  );
}
