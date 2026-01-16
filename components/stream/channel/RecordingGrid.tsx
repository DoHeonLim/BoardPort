/**
 * File Name : components/stream/channel/RecordingGrid
 * Description : 다시보기 2열 그리드 (FOLLOWERS Teaser 포함) - StreamCard 재사용
 * Author : 임도헌
 *
 * History
 * 2025.08.09  임도헌   Created   다시보기 그리드 분리
 * 2025.08.14  임도헌   Modified  썸네일 URL 정규화 + StreamCard 재사용
 * 2025.08.26  임도헌   Modified  서버 계산 플래그 우선 적용
 * 2025.08.27  임도헌   Modified  unlock 타깃 streamId 우선 전달
 * 2025.09.05  임도헌   Modified  (보강) unlock 타깃 streamId 우선 전달 로직 명시 + 불리언 캐스팅
 * 2025.09.13  임도헌   Modified  ended_at 우선 노출, TimeAgo에 Date 직접 전달, 반응형 1/2열
 * 2025.09.21  임도헌   Modified  카드 key를 vodId 기반으로, href 전달로 vodId 경로 사용
 * 2025.09.22  임도헌   Modified  VodForGrid(readyAt/duration/viewCount) 기준으로 정리
 * 2025.11.23  임도헌   Modified  StreamCard layout(grid) 명시 및 카드 래퍼 정리,
 *                                다시보기 메타 영역(길이/조회수) 높이 일관화
 * 2025.12.20  임도헌   Modified  FOLLOWERS/PRIVATE 잠금 정책 주석 보강(팔로우 vs 언락 플로우 구분)
 * 2026.01.04  임도헌   Modified  팔로우 즉시 반영: FOLLOWERS 잠금은 role/isFollowing을 SSOT로 계산
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */

"use client";

import StreamCard from "@/components/stream/StreamCard";
import TimeAgo from "@/components/ui/TimeAgo";
import { formatDuration } from "@/lib/utils";
import type { VodForGrid } from "@/types/stream";
import RecordingEmptyState from "./RecordingEmptyState";

type Role = "OWNER" | "FOLLOWER" | "VISITOR";

interface Props {
  recordings: VodForGrid[]; // VOD 중심 (readyAt/duration/viewCount 포함)
  role: Role;
  isFollowing: boolean;
  onFollow?: () => void;
}

export default function RecordingGrid({
  recordings,
  role,
  isFollowing,
  onFollow,
}: Props) {
  // 상단에서 이미 빈 배열을 거르는 게 단순/안전
  if (!recordings?.length)
    return (
      <RecordingEmptyState
        role={role}
        isFollowing={isFollowing}
        onFollow={onFollow}
      />
    );

  return (
    <div className="mx-auto max-w-3xl px-4 w-full">
      <h2 className="text-lg font-bold mb-3 text-primary">다시보기</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recordings.map((rec) => {
          // 표시 시간 = readyAt (없으면 생략)
          const when = rec.readyAt ?? null;

          // 길이
          const hasDuration =
            typeof rec.duration === "number" && rec.duration > 0;

          // 조회수
          const hasViews =
            typeof rec.viewCount === "number" && rec.viewCount >= 0;

          // 팔로워 방송인지
          const isFollowersOnly = rec.visibility === "FOLLOWERS";

          /**
           * FOLLOWERS 잠금은 "팔로우 직후 즉시 반영"이 필요하다.
           * - 서버 플래그(rec.followersOnlyLocked)는 초기 렌더의 기본값으로만 사용하고,
           * - 클라이언트 상태(role/isFollowing)를 SSOT로 한 번 더 적용해 잠금 여부를 계산한다.
           *
           * 규칙:
           * - OWNER는 항상 잠금 없음
           * - FOLLOWERS 타입이고 OWNER가 아니면: isFollowing이 false일 때만 잠금
           * - 그 외 타입은 서버 플래그를 그대로 따른다.
           */
          const followersOnlyLocked = isFollowersOnly
            ? role !== "OWNER" && !isFollowing
            : !!rec.followersOnlyLocked;

          // PRIVATE는 팔로우로 풀리는 게 아니라 "언락 여부"라 서버 플래그 유지가 맞음
          const requiresPassword = !!rec.requiresPassword;

          // unlock 타깃 = 부모 Broadcast id
          const unlockTargetId = rec.broadcastId;

          // 상세 경로: 없으면 vodId로 폴백
          const href = rec.href ?? `/streams/${rec.vodId}/recording`;

          // key = vodId
          const key = `vod-${rec.vodId}`;

          return (
            <div
              key={key}
              className="rounded-2xl overflow-hidden shadow-sm bg-surface border border-border"
            >
              <StreamCard
                id={unlockTargetId}
                title={rec.title}
                thumbnail={rec.thumbnail}
                isLive={false}
                streamer={{
                  username: rec.user.username,
                  avatar: rec.user.avatar ?? null,
                }}
                href={href}
                requiresPassword={requiresPassword}
                isFollowersOnly={isFollowersOnly}
                followersOnlyLocked={followersOnlyLocked}
                onRequestFollow={followersOnlyLocked ? onFollow : undefined}
                isPrivateType={rec.visibility === "PRIVATE"}
                layout="grid"
              />

              {(when || hasDuration || hasViews) && (
                <div className="px-3 pb-3 -mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    {when ? <TimeAgo date={when} /> : null}
                    {when && (hasDuration || hasViews) ? (
                      <span className="text-border mx-1">|</span>
                    ) : (
                      ""
                    )}

                    {hasDuration ? formatDuration(rec.duration!) : null}
                    {hasDuration && hasViews ? (
                      <span className="text-border mx-1">|</span>
                    ) : (
                      ""
                    )}

                    {hasViews
                      ? `조회 ${rec.viewCount!.toLocaleString()}`
                      : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
