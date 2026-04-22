/**
 * File Name : features/user/components/profile/MyProfileDeferredSections.tsx
 * Description : 내 프로필 하단 지연 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2026.04.16  임도헌   Created
 * 2026.04.16  임도헌   Modified   MyProfile 하단 섹션을 지연 렌더링 전용 컴포넌트로 분리
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import type { BroadcastSummary } from "@/features/stream/types";
import type { Badge, ProfileReview, UserProfile } from "@/features/user/types";
import LogoutButton from "@/components/global/LogoutButton";
import StreamCard from "@/features/stream/components/StreamCard";
import ProfileReviewPreviewList from "@/features/user/components/profile/ProfileReviewPreviewList";
import UserBadges from "@/features/user/components/profile/UserBadges";
import {
  ChevronRightIcon,
  ShoppingBagIcon,
  TagIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";

// content-visibility를 통한 첫 화면 밖 섹션의 레이아웃/페인트 비용 후순위 처리
const DEFERRED_SECTION_STYLE: CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "1px 360px",
};

type MyProfileDeferredSectionsProps = {
  myStreams?: BroadcastSummary[];
  previewReviews: ProfileReview[];
  returnTo: string;
  user: UserProfile;
  userBadges: Badge[];
  onOpenBadge: () => void;
  onOpenReview: () => void;
  onOpenWithdraw: () => void;
};

/**
 * 내 프로필 하단 섹션 묶음
 *
 * [분리 목적]
 * - 거래 정보, 방송국, 후기/뱃지, 계정 액션처럼 첫 화면 아래에 있는 UI를 별도 청크로 분리
 * - 상위 `MyProfile`은 초기 맥락이 중요한 영역만 즉시 렌더링하고, 이 컴포넌트는 스크롤 도달 시점까지 비용을 늦춘다
 * - 모달 오픈/returnTo 같은 상호작용은 부모에서 주입받아 상태 소유권을 단순하게 유지
 */
export default function MyProfileDeferredSections({
  myStreams,
  previewReviews,
  returnTo,
  user,
  userBadges,
  onOpenBadge,
  onOpenReview,
  onOpenWithdraw,
}: MyProfileDeferredSectionsProps) {
  return (
    <>
      {/* 4-1. 거래 바로가기 */}
      <section style={DEFERRED_SECTION_STYLE}>
        <h2 className="mb-3 text-sm font-bold text-primary">거래 정보</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/profile/my-sales"
            prefetch={false}
            scroll
            className="focus-ring-strong-inset group rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-[background-color,color,border-color,box-shadow] hover:border-brand/30 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2 text-brand dark:text-brand-light">
              <TagIcon className="size-5" />
              <span className="text-sm font-medium">판매 내역</span>
            </div>
            <p className="text-xs text-muted transition-colors group-hover:text-primary">
              판매 중인 물품 관리
            </p>
          </Link>

          <Link
            href="/profile/my-purchases"
            prefetch={false}
            scroll
            className="focus-ring-strong-inset group rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-[background-color,color,border-color,box-shadow] hover:border-brand/30 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2 text-accent-dark dark:text-accent">
              <ShoppingBagIcon className="size-5" />
              <span className="text-sm font-medium">구매 내역</span>
            </div>
            <p className="text-xs text-muted transition-colors group-hover:text-primary">
              구매한 물품 확인
            </p>
          </Link>

          <Link
            href="/profile/my-likes"
            prefetch={false}
            scroll
            className="focus-ring-strong-inset group col-span-2 flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-[background-color,color,border-color,box-shadow] hover:border-brand/30 hover:shadow-md"
          >
            <div>
              <div className="mb-1 flex items-center gap-2 text-danger">
                <HeartIcon className="size-5" />
                <span className="text-sm font-medium">찜한 내역</span>
              </div>
              <p className="text-xs text-muted transition-colors group-hover:text-primary">
                내가 찜한 관심 상품
              </p>
            </div>
            <ChevronRightIcon className="size-5 text-muted transition-colors group-hover:text-brand dark:group-hover:text-brand-light" />
          </Link>
        </div>
      </section>

      {/* 4-2. 방송국 레일 */}
      <section style={DEFERRED_SECTION_STYLE}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">내 방송국</h2>
          <Link
            href={`/profile/${user.username}/channel?returnTo=${encodeURIComponent(returnTo)}`}
            prefetch={false}
            aria-label="방송국 전체 보기"
            className="focus-ring-soft flex items-center rounded-md text-xs text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
          >
            방송국 전체 보기
            <ChevronRightIcon className="ml-0.5 size-3" />
          </Link>
        </div>

        {!myStreams || myStreams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-subtle bg-surface-dim/30 py-6 text-center">
            <p className="text-xs text-muted">아직 방송 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {myStreams.map((stream) => (
              <div key={stream.id} className="shrink-0">
                <StreamCard
                  id={stream.id}
                  vodIdForRecording={stream.latestVodId ?? undefined}
                  title={stream.title}
                  thumbnail={stream.thumbnail}
                  isLive={stream.status === "CONNECTED"}
                  showReplayBadge={
                    stream.status === "ENDED" && !!stream.latestVodId
                  }
                  streamer={{
                    username: stream.user.username,
                    avatar: stream.user.avatar ?? null,
                  }}
                  layout="rail"
                  shortDescription
                  showStreamer={false}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4-3. 신뢰 정보 및 획득 내역 */}
      <div className="grid grid-cols-1 gap-6" style={DEFERRED_SECTION_STYLE}>
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">받은 거래 후기</h2>
            <button
              onClick={onOpenReview}
              aria-label="받은 거래 후기 전체 보기"
              className="focus-ring-soft rounded-md text-xs text-muted hover:text-brand dark:hover:text-brand-light"
            >
              전체 보기
            </button>
          </div>
          <ProfileReviewPreviewList reviews={previewReviews} />
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">획득한 뱃지</h2>
            <button
              onClick={onOpenBadge}
              aria-label="획득한 뱃지 전체 보기"
              className="focus-ring-soft rounded-md text-xs text-muted hover:text-brand dark:hover:text-brand-light"
            >
              전체 보기
            </button>
          </div>
          <UserBadges badges={userBadges} max={6} />
        </section>
      </div>

      {/* 4-4. 계정 액션 */}
      <div
        className="mt-2 border-t border-border-subtle pt-6"
        style={DEFERRED_SECTION_STYLE}
      >
        <LogoutButton className="focus-ring-soft h-12 w-full rounded-xl border border-border-subtle bg-surface text-sm font-medium text-danger transition-colors hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-60" />
        <div className="mt-4 text-center">
          <p className="text-xs text-muted">
            계정을 완전히 삭제하려면 회원 탈퇴를 진행하세요.
          </p>
          <button
            type="button"
            onClick={onOpenWithdraw}
            className="focus-ring-soft mt-2 inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium text-danger transition-colors hover:text-danger/80"
          >
            <UserMinusIcon className="size-4" />
            회원 탈퇴
          </button>
        </div>
      </div>
    </>
  );
}
