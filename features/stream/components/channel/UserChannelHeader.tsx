/**
 * File Name : features/stream/components/channel/UserChannelHeader.tsx
 * Description : 방송국 헤더 (프로필, 팔로우, 채널 소개)
 * Author : 임도헌
 *
 * History
 * 2025.08.09  임도헌   Created
 * 2025.09.09  임도헌   Modified  팔로우 버튼 클릭/대기상태 로깅
 * 2025.10.14  임도헌   Modified  FollowSection 내장, 콜백/상태 관리 제거
 * 2025.11.10  임도헌   Modified  변경된 FollowSection에 맞게 수정
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.08  임도헌   Modified  UserAvatar와 헤더 텍스트의 닉네임 중복 표시를 제거
 * 2026.03.13  임도헌   Modified  프로필 이동 시 현재 방송국 경로를 returnTo로 함께 전달해 복귀 맥락 유지
 * 2026.03.17  임도헌   Modified  방송국 헤더를 카드형 패널로 정리해 프로필/팔로우 정보의 시각적 밀도를 개선
 * 2026.03.18  임도헌   Modified  방송국 현재 경로도 내부 경로 기준으로 정규화해 nested returnTo 예외를 완화
 * 2026.03.19  임도헌   Modified  채널 헤더 외곽선도 border-border-subtle 기준으로 맞춰 스트림 패널 톤을 통일
 * 2026.03.21  임도헌   Modified  방송국 전용 소개글(channelDescription) 노출로 하드코딩 소개 문구 제거
 * 2026.03.21  임도헌   Modified  채널 소개 문구의 줄 수/여백을 조정해 모바일/데스크톱 헤더 밀도를 안정화
 * 2026.03.21  임도헌   Modified  owner 전용 채널 소개 인라인 수정 UI 추가
 * 2026.03.25  임도헌   Modified  유저 채널 arrange 패스: 모바일 헤더 패딩과 그룹 간격을 소폭 압축
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import UserAvatar from "@/components/global/UserAvatar";
import FollowSection from "@/features/user/components/follow/FollowSection";
import { cn } from "@/lib/utils";
import type { ChannelDescriptionActionState } from "@/features/user/types";

type ChannelDescriptionAction = (
  formData: FormData
) => Promise<ChannelDescriptionActionState>;

interface Props {
  ownerId: number;
  username: string;
  avatar?: string | null;
  channelDescription?: string | null;

  initialFollowerCount: number;
  initialFollowingCount: number;
  initialIsFollowing: boolean;

  isMe: boolean;
  isBlocked?: boolean;
  viewerId?: number;

  channelDescriptionAction?: ChannelDescriptionAction;
  onRequireLogin?: () => void;
  onFollowingChange?: (now: boolean) => void;
}

/**
 * 방송국 상단 헤더 컴포넌트
 *
 * - 스트리머의 프로필 정보(아바타, 이름)를 표시
 * - `FollowSection`을 포함하여 팔로워 수/팔로우 버튼을 제공
 * - 채널 소개를 노출하고, owner일 때는 인라인 수정 UI를 제공
 * - 일반 프로필 페이지로 이동하는 링크를 제공
 */
export default function UserChannelHeader({
  ownerId,
  username,
  avatar,
  channelDescription,
  initialFollowerCount,
  initialFollowingCount,
  initialIsFollowing,
  isMe,
  isBlocked,
  viewerId,
  channelDescriptionAction,
  onRequireLogin,
  onFollowingChange,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString();
  const returnTo = sanitizeCallbackUrl(
    `${pathname}${currentSearch ? `?${currentSearch}` : ""}`
  );
  const [description, setDescription] = useState(channelDescription ?? "");
  const [draft, setDraft] = useState(channelDescription ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = channelDescription ?? "";
    setDescription(next);
    if (!isEditing) setDraft(next);
  }, [channelDescription, isEditing]);

  const hasDescription = !!description.trim();

  const startEditing = () => {
    setDraft(description);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(description);
    setIsEditing(false);
  };

  const saveDescription = async () => {
    if (!channelDescriptionAction || saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("channelDescription", draft.trim());
      const result = await channelDescriptionAction(fd);
      if (!result.success) {
        toast.error(result.error ?? "채널 소개를 저장하지 못했습니다.");
        return;
      }
      const next = result.value ?? "";
      setDescription(next);
      setDraft(next);
      setIsEditing(false);
      toast.success(
        next ? "채널 소개를 저장했습니다." : "채널 소개를 삭제했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl w-full px-4 pt-4 pb-5 sm:pt-6 sm:pb-6">
      <div className="rounded-2xl border border-border-subtle bg-surface px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <UserAvatar
            username={username}
            avatar={avatar}
            showUsername={false}
            size="lg"
            className="ring-2 ring-background shadow-sm"
          />

          <div className="min-w-0 flex-1">
            <div
              className={cn("flex flex-col", hasDescription ? "gap-1.5" : "gap-2")}
            >
              <h1 className="text-xl font-bold text-primary truncate">
                {username}
              </h1>
              {isEditing ? (
                <div className="rounded-xl border border-border-subtle bg-surface-dim/60 p-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={160}
                    placeholder="내 방송국을 한두 문장으로 소개해보세요."
                    className="min-h-[88px] w-full resize-none rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-sm leading-relaxed text-primary outline-none placeholder:text-muted"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
                    <span>{draft.length}/160</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={saving}
                        className="rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface disabled:opacity-50"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={saveDescription}
                        disabled={saving}
                        className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                      >
                        {saving ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : hasDescription ? (
                <p className="max-w-[46ch] break-words text-sm leading-relaxed text-muted line-clamp-2 sm:line-clamp-3">
                  {description}
                </p>
              ) : null}
              <div className="flex items-center gap-3">
                <FollowSection
                  ownerId={ownerId}
                  ownerUsername={username}
                  initial={{
                    isFollowing: !!initialIsFollowing,
                    followerCount: initialFollowerCount,
                    followingCount: initialFollowingCount,
                  }}
                  viewer={{ id: viewerId }}
                  showButton={!isMe}
                  size="compact"
                  align="start"
                  onRequireLogin={onRequireLogin}
                  onFollowingChange={onFollowingChange}
                  followButtonId="channel-follow-button"
                  isBlocked={isBlocked}
                />
                {isMe && !isEditing && channelDescriptionAction ? (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-dim hover:text-primary"
                  >
                    {hasDescription ? "소개 수정" : "채널 소개 추가"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center sm:mt-5">
          <Link
            href={`/profile/${username}?returnTo=${encodeURIComponent(returnTo)}`}
            className={cn(
              "w-full max-w-sm flex items-center justify-center py-2.5 rounded-xl transition-colors",
              "bg-surface-dim text-sm font-medium text-primary border border-border hover:bg-border shadow-sm"
            )}
          >
            프로필 보러가기
          </Link>
        </div>
      </div>
    </div>
  );
}
