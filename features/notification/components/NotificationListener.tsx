/**
 * File Name : features/notification/components/NotificationListener.tsx
 * Description : 푸시 알림 및 시스템 이벤트 리스너 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.22  임도헌   Created
 * 2024.12.22  임도헌   Modified  푸시 알림 리스너 컴포넌트 추가
 * 2025.01.12  임도헌   Modified  푸시 알림 이미지 추가
 * 2025.07.24  임도헌   Modified  console.log(payload) 삭제
 * 2025.11.10  임도헌   Modified  유저 전용 채널/토스트 중복 억제/비가시 억제
 * 2025.12.28  임도헌   Modified  payload.userId 누락도 허용(하위 호환), STREAM 타입 반영,
 *                                toast dedupe 개선(id 우선), 채널 cleanup(removeChannel) 추가
 * 2026.01.08  임도헌   Modified  현재 채팅방(pathname)과 일치하는 알림은 토스트 무시 (중복 방지)
 * 2026.01.16  임도헌   Moved     components/common -> components/notification
 * 2026.01.17  임도헌   Moved     components/notification -> features/notification/components
 * 2026.02.08  임도헌   Modified  pathname 의존성 제거로 페이지 이동 시 연결 끊김 방지
 * 2026.02.11  임도헌   Modified  NotificationBell과의 채널 충돌 방지를 위해 로컬 이벤트 발행 로직 추가
 * 2026.02.22  임도헌   Modified  현재 페이지 알림 수신 시 벨 카운트 깜빡임(Flicker) 방지
 */
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";

type NotiPayload = {
  id?: number;
  userId: number;
  title: string;
  body: string;
  link?: string;
  image?: string;
  type?: "CHAT" | "TRADE" | "REVIEW" | "SYSTEM" | "BADGE" | "STREAM";
};

type SysEventPayload = {
  type: "BAN" | "BLOCK";
  reason?: string;
  until?: string; // BAN only
  actorId?: number; // BLOCK only
};

/**
 * 전역 알림 리스너 (Root Layout 전용)
 *
 * [역할 및 기능]
 * 1. Single Source of Truth (SSOT): 앱 내에서 유일하게 `user-{id}-notifications` 채널을 구독
 *    - 여러 컴포넌트에서 동일 채널을 구독/해제할 때 발생하는 연결 끊김 문제를 방지
 *
 * 2. 이벤트 브리지 (Event Bridge):
 *    - 알림(`notification`) 수신 시 `sys:notification`이라는 Window 이벤트를 발행
 *    - 이를 통해 `NotificationBell` 등 UI 컴포넌트가 Supabase 연결 없이도 상태를 갱신할 수 있음
 *
 * 3. 보안 집행 (Security Enforcer):
 *    - 시스템 이벤트(`sys_event`) 중 `BAN` 타입을 감지
 *    - 정지 명령 수신 즉시 세션을 갱신하고 `/403` 페이지로 강제 리다이렉트
 *
 * @param {number} userId - 로그인한 사용자 ID
 */
export default function NotificationListener({ userId }: { userId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // 현재 경로 추적 (알림 클릭 시 중복 이동 방지용)
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;

    const channelName = `user-${userId}-notifications`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "notification" }, ({ payload }) => {
        const p = payload as Partial<NotiPayload>;

        if (typeof p.userId === "number" && p.userId !== userId) return;

        // 현재 보고 있는 페이지(예: 현재 채팅방)와 관련된 알림이면
        // 토스트뿐만 아니라 전역 벨 카운트 증가 이벤트(sys:notification)도 생략
        // 이를 통해 0 -> 1 -> 0 으로 번쩍거리는 UX 결함을 방지
        if (
          typeof document !== "undefined" &&
          !document.hidden &&
          p.link &&
          pathnameRef.current === p.link
        ) {
          return;
        }

        // 로컬 이벤트 발행 -> NotificationBell이 수신하여 뱃지 카운트 증가
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("sys:notification", { detail: p })
          );
        }

        // 현재 보고 있는 페이지와 관련된 알림이면 토스트 생략 (예: 현재 채팅방의 새 메시지)
        if (
          typeof document !== "undefined" &&
          !document.hidden &&
          p.link &&
          pathnameRef.current === p.link
        ) {
          return;
        }

        // 토스트 알림 표시
        const toastId = p.id
          ? `noti:${p.id}`
          : `noti:${p.type ?? "SYSTEM"}:${p.link ?? ""}`;

        toast(p.title ?? "알림", {
          id: toastId,
          description: p.body ?? "",
          icon: p.image ? (
            <div className="relative h-6 w-6">
              <Image
                src={p.image}
                alt=""
                fill
                sizes="24px"
                className="rounded-full object-cover"
                priority
              />
            </div>
          ) : undefined,
          action: p.link
            ? { label: "보기", onClick: () => router.push(p.link!) }
            : undefined,
        });
      })
      .on("broadcast", { event: "sys_event" }, async ({ payload }) => {
        const p = payload as SysEventPayload;

        // 실시간 정지(BAN) 처리
        if (p.type === "BAN") {
          try {
            // 1. 서버 세션 쿠키 갱신 (banned: true 설정)
            await fetch("/api/auth/refresh", { method: "POST" });
          } catch (e) {
            console.error("Session refresh failed", e);
          }

          // 2. 사용자 피드백
          toast.error(`서비스 이용이 정지되었습니다.\n사유: ${p.reason}`, {
            duration: Infinity,
            position: "top-center",
          });

          // 3. 강제 페이지 이동 (SPA 라우팅 대신 href 사용하여 미들웨어 거치도록 함)
          setTimeout(() => {
            window.location.href = `/403?reason=BANNED&banReason=${encodeURIComponent(
              p.reason || ""
            )}`;
          }, 1000);
        }
      });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      // 컴포넌트 언마운트 시(로그아웃 등)에만 연결 해제
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
