/**
 * File Name : features/notification/components/NotificationListener.tsx
 * Description : 푸시 알림 리스너 컴포넌트
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
 */
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";

type NotiPayload = {
  /** DB Notification ID (토스트 중복 제거용 Key) */
  id?: number;
  userId: number;
  title: string;
  body: string;
  link?: string;
  image?: string;
  type?: "CHAT" | "TRADE" | "REVIEW" | "SYSTEM" | "BADGE" | "STREAM";
};

/**
 * 실시간 알림 리스너
 *
 * - 로그인된 유저의 전용 채널(`user-${userId}-notifications`)을 구독합니다.
 * - 새 알림(`notification` 이벤트) 수신 시 `sonner`를 사용하여 토스트를 띄웁니다.
 * - 현재 보고 있는 페이지(`pathname`)와 관련된 알림(예: 채팅방)은 무시하여 중복 UX를 방지합니다.
 * - 앱이 백그라운드(`document.hidden`)에 있을 때는 토스트를 띄우지 않습니다. (시스템 푸시가 처리함)
 *
 * @param userId - 현재 로그인된 유저 ID
 */
export default function NotificationListener({ userId }: { userId: number }) {
  const pathname = usePathname();

  useEffect(() => {
    const channelName = `user-${userId}-notifications` as const;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "notification" }, ({ payload }) => {
        const p = payload as Partial<NotiPayload>;

        // Payload 유효성 검사
        if (typeof p.userId === "number" && p.userId !== userId) return;

        // 앱이 백그라운드 상태면 무시 (OS 푸시 알림이 대신함)
        if (typeof document !== "undefined" && document.hidden) return;

        // 현재 페이지와 관련된 알림이면 무시 (예: 해당 채팅방에 있는 경우)
        if (p.link && pathname === p.link) {
          return;
        }

        // 토스트 ID 생성 (중복 표시 방지)
        // ID가 있으면 ID 사용, 없으면 타입+링크 조합 사용
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
            ? { label: "보기", onClick: () => (window.location.href = p.link!) }
            : undefined,
        });
      })
      .subscribe();

    return () => {
      // 채널 구독 해제 및 제거 (리소스 누수 방지)
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  return null;
}
