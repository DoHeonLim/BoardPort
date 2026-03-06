/**
 * File Name : components/global/AccessDenied.tsx
 * Description : 전역 접근 권한 거부 안내 컴포넌트 (403 전용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.06  임도헌   Created
 * 2025.11.01  임도헌   Modified  로그인 파라미터 callbackUrl 통일, useFollowToggle 호출 정합
 * 2025.11.22  임도헌   Modified  로그인 요구 시 callbackUrl 재진입 방지(loginRequired 플래그 도입)
 * 2026.01.14  임도헌   Modified  파일명 변경(Client 제거) 및 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.04  임도헌   Moved     stream -> global
 * 2026.02.04  임도헌   Modified  [Feat] BLOCKED 사유 추가 및 아이콘 대응
 * 2026.02.05  임도헌   Modified  모달 Dynamic Import 적용
 * 2026.02.08  임도헌   Modified  BANNED 상태 시 '홈으로' 대신 명시적 '로그아웃' 버튼 제공
 * 2026.03.06  임도헌   Modified  LogoutButton 적용으로 로그아웃 pending/toast 처리 일원화
 * 2026.03.06  임도헌   Modified  Forbidden 상태 화면 공통 레이아웃 유틸을 적용해 안내/CTA 톤을 통일
 */

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useFollowToggle } from "@/features/user/hooks/useFollowToggle";
import {
  LockClosedIcon,
  UserGroupIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import LogoutButton from "@/components/global/LogoutButton";

const PrivateAccessModal = dynamic(
  () => import("@/features/stream/components/PrivateAccessModal"),
  { ssr: false }
);

type Reason = "PRIVATE" | "FOLLOWERS_ONLY" | "BLOCKED" | "BANNED" | "UNKNOWN";

interface AccessDeniedProps {
  reason: Reason;
  username: string; // 상대방 닉네임 (표시용)
  callbackUrl: string;
  streamId?: number; // PRIVATE 언락용
  ownerId?: number; // 팔로우용
  viewerId: number | null;
  banDetails?: {
    until: Date | null;
    reason: string;
  } | null;
}

/**
 * - BLOCKED: 유저 차단 관계인 경우
 * - FOLLOWERS_ONLY: 팔로워 전용 콘텐츠인 경우
 * - PRIVATE: 비밀번호가 필요한 경우
 * - BANNED : 유저 정지
 */
export default function AccessDenied({
  reason,
  username,
  callbackUrl,
  streamId,
  ownerId,
  viewerId,
  banDetails,
}: AccessDeniedProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { toggle, isPending } = useFollowToggle();

  const pending = typeof ownerId === "number" ? isPending(ownerId) : false;

  const goLogin = () =>
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const goProfileForFollow = () =>
    router.push(`/profile/${encodeURIComponent(username)}`);

  const goHome = () => router.push("/");

  const doFollow = async () => {
    if (!ownerId) return goProfileForFollow();

    let loginRequired = false;
    await toggle(ownerId, false, {
      viewerId,
      refresh: false,
      onRequireLogin: () => {
        loginRequired = true;
        goLogin();
      },
    });

    if (!loginRequired) {
      router.replace(callbackUrl);
    }
  };

  return (
    <div className="state-screen min-h-[60vh]">
      <div className="state-card">
        <div className="state-icon-wrap">
          {reason === "PRIVATE" ? (
            <LockClosedIcon className="size-10 text-amber-500" />
          ) : reason === "FOLLOWERS_ONLY" ? (
            <UserGroupIcon className="size-10 text-indigo-500" />
          ) : reason === "BLOCKED" ? (
            <UserMinusIcon className="size-10 text-danger" />
          ) : (
            <LockClosedIcon className="size-10 text-muted" />
          )}
        </div>

        <h1 className="state-title">접근할 수 없습니다</h1>

        {reason === "BLOCKED" && (
          <>
            <p className="state-description">
              <span className="font-semibold text-primary">@{username}</span>님과
              차단 관계가 설정되어 있어 페이지에 접근할 수 없습니다.
            </p>
            <div className="state-actions">
              <button onClick={goHome} className="btn-primary min-h-[44px] w-full">
                홈으로 가기
              </button>
              <button
                onClick={() => router.back()}
                className="btn-secondary min-h-[44px] w-full"
              >
                뒤로가기
              </button>
            </div>
          </>
        )}

        {reason === "FOLLOWERS_ONLY" && (
          <>
            <p className="state-description">
              <span className="font-semibold text-primary">@{username}</span>님의
              방송은 <span className="font-medium text-indigo-500">팔로워 전용</span>
              입니다.
            </p>
            <div className="state-actions">
              {!!ownerId ? (
                <button
                  onClick={doFollow}
                  disabled={pending}
                  className="btn-primary min-h-[44px] w-full"
                >
                  {pending ? "처리 중..." : "팔로우하고 입장하기"}
                </button>
              ) : (
                <button
                  onClick={goProfileForFollow}
                  className="btn-primary min-h-[44px] w-full"
                >
                  프로필로 이동
                </button>
              )}
              <button
                onClick={goLogin}
                className="btn-secondary min-h-[44px] w-full"
              >
                로그인
              </button>
            </div>
          </>
        )}

        {reason === "PRIVATE" && (
          <>
            <p className="state-description">
              <span className="font-semibold text-primary">@{username}</span>님의
              방송은 <span className="font-medium text-amber-500">비밀번호</span>가
              필요합니다.
            </p>
            <div className="state-actions">
              {streamId != null ? (
                <button
                  onClick={() => setOpen(true)}
                  className="btn-primary min-h-[44px] w-full bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                >
                  비밀번호 입력
                </button>
              ) : (
                <button
                  onClick={() => router.push(callbackUrl)}
                  className="btn-primary min-h-[44px] w-full"
                >
                  다시 시도
                </button>
              )}
              <button
                onClick={() => router.push("/streams")}
                className="btn-secondary min-h-[44px] w-full"
              >
                목록으로
              </button>
            </div>

            {streamId != null && (
              <PrivateAccessModal
                open={open}
                onOpenChange={setOpen}
                streamId={streamId}
                redirectHref={callbackUrl}
              />
            )}
          </>
        )}

        {reason === "BANNED" && (
          <>
            <p className="state-description">
              운영 정책 위반으로 인해 서비스 이용이 제한되었습니다.
            </p>

            {banDetails && (
              <div className="mt-6 w-full rounded-xl border border-border bg-surface p-4 text-left shadow-sm">
                <div>
                  <span className="mb-0.5 block text-xs font-bold text-muted">
                    정지 사유
                  </span>
                  <p className="text-sm text-primary">{banDetails.reason}</p>
                </div>
                <div className="my-3 border-t border-border" />
                <div>
                  <span className="mb-0.5 block text-xs font-bold text-muted">
                    해제 예정일
                  </span>
                  <p className="font-mono text-sm text-primary">
                    {banDetails.until
                      ? new Date(banDetails.until).getFullYear() === 9999
                        ? "영구 정지"
                        : new Date(banDetails.until).toLocaleString()
                      : "알 수 없음"}
                  </p>
                </div>
              </div>
            )}

            <div className="state-actions">
              <LogoutButton
                className="w-full rounded-xl bg-red-600 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] font-bold"
                idleLabel="로그아웃 (확인)"
              />
            </div>
          </>
        )}

        {reason === "UNKNOWN" && (
          <>
            <p className="state-description">
              접근 권한을 확인할 수 없습니다.
            </p>
            <div className="state-actions justify-center">
              <button
                onClick={() => router.push("/streams")}
                className="btn-secondary min-h-[44px] w-full"
              >
                목록으로 돌아가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
