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
 * 2026.03.13  임도헌   Modified  팔로워 전용/차단 안내 화면에서 프로필 이동 시 callbackUrl을 returnTo로 함께 전달
 * 2026.03.18  임도헌   Modified  FOLLOWERS_ONLY CTA를 실제 세션 기준으로 분기하고, callbackUrl/returnTo 복원 + 도메인별 목록 fallback으로 403 복귀 문맥을 통합 정리
 * 2026.03.23  임도헌   Modified  금지 상태 상세 카드와 내부 구분선을 구조 구분용 border-border-subtle 기준으로 정리
 * 2026.04.04  임도헌   Modified  helper/props 설명을 보강해 사유별 복귀 문맥과 CTA 분기 의도를 더 명확히 정리
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 접근 거부 안내 강조 텍스트를 500 기준으로 정리
 * 2026.04.20  임도헌   Modified  팔로워 전용 CTA가 버튼 폭 안에서 자연스럽게 줄바꿈되도록 문구 배치를 정리
 */

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
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
 * 차단 화면에서 돌아갈 기본 문맥을 callbackUrl 기준으로 복원
 *
 * - 상세 페이지가 returnTo로 한 번 더 감싼 경우 nested returnTo 우선 복원
 * - 복원 정보가 없으면 현재 접근 경로 접두사 기준의 목록 fallback 결정
 */
function inferContextListHref(callbackUrl: string) {
  const queryString = callbackUrl.split("?")[1] ?? "";
  const params = new URLSearchParams(queryString);
  const nestedReturnTo = params.get("returnTo");
  if (nestedReturnTo) {
    return sanitizeCallbackUrl(nestedReturnTo);
  }

  if (callbackUrl.startsWith("/products")) return "/products";
  if (callbackUrl.startsWith("/posts")) return "/posts";
  if (callbackUrl.startsWith("/streams")) return "/streams";
  if (callbackUrl.startsWith("/chat") || callbackUrl.startsWith("/chats")) {
    return "/chat";
  }
  if (callbackUrl.startsWith("/profile")) return "/profile";

  return "/";
}

/**
 * 403 상태 화면을 사유별 CTA와 함께 렌더링하는 전역 공통 UI 컴포넌트
 *
 * - nested returnTo 우선 복원
 * - 도메인별 목록 fallback 복원
 * - 로그인, 팔로우, 비밀번호 입력, 목록 복귀 CTA 분기
 *
 * @param {AccessDeniedProps} props - 접근 차단 사유와 복귀 문맥, CTA 분기 정보
 * @returns {JSX.Element} 접근 차단 안내 화면
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

  // 상세 callbackUrl 안에 감긴 원래 목록/채널 문맥을 우선 복원
  // nested returnTo가 없을 때만 현재 경로 접두사로 도메인 fallback 복원
  const contextListHref = inferContextListHref(callbackUrl);

  const goLogin = () =>
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const goProfileForFollow = () =>
    router.push(
      `/profile/${encodeURIComponent(username)}?returnTo=${encodeURIComponent(callbackUrl)}`
    );

  const goContextList = () => router.push(contextListHref);
  const blockedFallbackLabel =
    contextListHref === "/" ? "홈으로 가기" : "목록으로 가기";

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
              <span className="font-medium text-primary">@{username}</span>
              님과 차단 관계가 설정되어 있어 페이지에 접근할 수 없습니다.
            </p>
            <div className="state-actions">
              <button
                onClick={goContextList}
                className="btn-primary min-h-[44px] w-full"
              >
                {blockedFallbackLabel}
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
              <span className="font-medium text-primary">@{username}</span>
              님의 방송은{" "}
              <span className="font-medium text-indigo-500">팔로워 전용</span>
              입니다.
            </p>
            <div className="state-actions">
              {!!ownerId ? (
                <button
                  onClick={doFollow}
                  disabled={pending}
                  className="btn-primary min-h-[44px] w-full"
                >
                  {pending ? (
                    "처리 중..."
                  ) : (
                    <span className="flex flex-col items-center leading-tight">
                      <span>팔로우하고</span>
                      <span>입장하기</span>
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={goProfileForFollow}
                  className="btn-primary min-h-[44px] w-full"
                >
                  프로필로 이동
                </button>
              )}
              {viewerId ? (
                <button
                  onClick={() => router.push(contextListHref)}
                  className="btn-secondary min-h-[44px] w-full"
                >
                  목록으로
                </button>
              ) : (
                <button
                  onClick={goLogin}
                  className="btn-secondary min-h-[44px] w-full"
                >
                  로그인
                </button>
              )}
            </div>
          </>
        )}

        {reason === "PRIVATE" && (
          <>
            <p className="state-description">
              <span className="font-medium text-primary">@{username}</span>
              님의 방송은{" "}
              <span className="font-medium text-amber-500">비밀번호</span>가
              필요합니다.
            </p>
            <div className="state-actions">
              {streamId != null ? (
                <button
                  onClick={() => setOpen(true)}
                  className="btn-primary min-h-[44px] w-full bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600"
                >
                  입장하기
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
                onClick={() => router.push(contextListHref)}
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
              <div className="mt-6 w-full rounded-xl border border-border-subtle bg-surface p-4 text-left shadow-sm">
                <div>
                  <span className="mb-0.5 block text-xs font-bold text-muted">
                    정지 사유
                  </span>
                  <p className="text-sm text-primary">{banDetails.reason}</p>
                </div>
                <div className="my-3 border-t border-border-subtle" />
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
            <p className="state-description">접근 권한을 확인할 수 없습니다.</p>
            <div className="state-actions justify-center">
              <button
                onClick={() => router.push(contextListHref)}
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
