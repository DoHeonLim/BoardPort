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
  /** DB Notification id (있는 경우). 토스트 dedupe에 활용 */
  id?: number;
  userId: number;
  title: string;
  body: string;
  link?: string;
  image?: string;
  type?: "CHAT" | "TRADE" | "REVIEW" | "SYSTEM" | "BADGE" | "STREAM";
};

export default function NotificationListener({ userId }: { userId: number }) {
  const pathname = usePathname();

  useEffect(() => {
    const channelName = `user-${userId}-notifications` as const;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "notification" }, ({ payload }) => {
        const p = payload as Partial<NotiPayload>;

        // 채널 자체가 user-${id} 스코프라 기본적으로는 안전하지만,
        // 혹시 잘못된 payload가 들어오는 케이스를 방어한다.
        // (과거 payload에 userId가 없던 케이스도 있기 때문에 "있을 때만" 검증)
        if (typeof p.userId === "number" && p.userId !== userId) return;
        if (typeof document !== "undefined" && document.hidden) return;

        // 현재 보고 있는 페이지가 알림 링크와 같다면 토스트 무시 (채팅방 등)
        // p.link 예: "/chats/cl..."
        if (p.link && pathname === p.link) {
          return;
        }

        // id가 있으면 1:1로, 없으면 type+link로 dedupe (채팅/거래/방송은 link가 key 역할)
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
      // unsubscribe()만으로도 동작은 하지만, removeChannel까지 호출해 리소스 누수를 방지한다.
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  return null;
}
