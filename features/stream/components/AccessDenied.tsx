/**
 * File Name : features/stream/components/AccessDenied.tsx
 * Description : 스트리밍 접근 권한 거부 안내
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.06  임도헌   Created
 * 2025.11.01  임도헌   Modified  로그인 파라미터 callbackUrl 통일, useFollowToggle 호출 정합
 * 2025.11.22  임도헌   Modified  로그인 요구 시 callbackUrl 재진입 방지(loginRequired 플래그 도입)
 * 2026.01.14  임도헌   Modified  파일명 변경(Client 제거) 및 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PrivateAccessModal from "@/features/stream/components/PrivateAccessModal";
import { useFollowToggle } from "@/features/user/hooks/useFollowToggle";
import { LockClosedIcon, UserGroupIcon } from "@heroicons/react/24/outline";

type Reason = "PRIVATE" | "FOLLOWERS_ONLY" | "UNKNOWN";

interface AccessDeniedProps {
  reason: Reason;
  username: string;
  callbackUrl: string;
  streamId?: number;
  ownerId?: number;
  viewerId: number | null;
}

export default function AccessDenied({
  reason,
  username,
  callbackUrl,
  streamId,
  ownerId,
  viewerId,
}: AccessDeniedProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { toggle, isPending } = useFollowToggle();

  const pending = typeof ownerId === "number" ? isPending(ownerId) : false;

  const goLogin = () =>
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const goProfileForFollow = () =>
    router.push(`/profile/${encodeURIComponent(username)}`);

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-in">
      {/* Icon Area */}
      <div className="mb-6 p-4 rounded-full bg-surface-dim">
        {reason === "PRIVATE" ? (
          <LockClosedIcon className="size-10 text-amber-500" />
        ) : reason === "FOLLOWERS_ONLY" ? (
          <UserGroupIcon className="size-10 text-indigo-500" />
        ) : (
          <LockClosedIcon className="size-10 text-muted" />
        )}
      </div>

      <h1 className="mb-3 text-2xl font-bold text-primary">
        접근할 수 없습니다
      </h1>

      {reason === "FOLLOWERS_ONLY" && (
        <>
          <p className="mb-8 text-muted max-w-sm leading-relaxed">
            <span className="font-semibold text-primary">@{username}</span>님의
            방송은{" "}
            <span className="text-indigo-500 font-medium">팔로워 전용</span>
            입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            {typeof ownerId === "number" ? (
              <button
                onClick={doFollow}
                disabled={pending}
                className="btn-primary w-full"
              >
                {pending ? "처리 중..." : "팔로우하고 입장하기"}
              </button>
            ) : (
              <button
                onClick={goProfileForFollow}
                className="btn-primary w-full"
              >
                프로필로 이동
              </button>
            )}
            <button onClick={goLogin} className="btn-secondary w-full">
              로그인
            </button>
          </div>
        </>
      )}

      {reason === "PRIVATE" && (
        <>
          <p className="mb-8 text-muted max-w-sm leading-relaxed">
            <span className="font-semibold text-primary">@{username}</span>님의
            방송은 <span className="text-amber-500 font-medium">비밀번호</span>
            가 필요합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            {typeof streamId === "number" ? (
              <button
                onClick={() => setOpen(true)}
                className="btn-primary w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white"
              >
                비밀번호 입력
              </button>
            ) : (
              <button
                onClick={() => router.push(callbackUrl)}
                className="btn-primary w-full"
              >
                다시 시도
              </button>
            )}
            <button
              onClick={() => router.push("/streams")}
              className="btn-secondary w-full"
            >
              목록으로
            </button>
          </div>

          {typeof streamId === "number" && (
            <PrivateAccessModal
              open={open}
              onOpenChange={setOpen}
              streamId={streamId}
              redirectHref={callbackUrl}
            />
          )}
        </>
      )}

      {reason === "UNKNOWN" && (
        <>
          <p className="mb-8 text-muted">접근 권한을 확인할 수 없습니다.</p>
          <button
            onClick={() => router.push("/streams")}
            className="btn-secondary w-full max-w-xs"
          >
            목록으로 돌아가기
          </button>
        </>
      )}
    </div>
  );
}
