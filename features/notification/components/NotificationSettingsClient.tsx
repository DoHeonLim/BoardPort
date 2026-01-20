/**
 * File Name : features/notification/components/NotificationSettingsClient
 * Description : 알림 설정 클라이언트 폼 컴포넌트 (푸시 토글 + 알림 종류/시간대)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.29  임도헌   Created   알림 종류/시간대 UI 및 저장 로직 구현
 * 2025.11.29  임도헌   Modified  헤더/프로필 복귀 버튼 및 문구 단순화
 * 2025.12.03  임도헌   Modified  props에 stream 추가
 * 2025.12.21  임도헌   Modified  pushEnabled는 전역 푸시 토글로 분리,
 *                                폼에서는 알림 종류/방해금지 시간만 저장(푸시는 PushNotificationToggle로만 제어)
 * 2026.01.16  임도헌   Modified  폼 요소 개선
 * 2026.01.17  임도헌   Moved     components/notification -> features/notification/components
 */

"use client";

import { useFormState } from "react-dom";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PushNotificationToggle } from "@/features/notification/components/PushNotificationToggle";
import { updateNotificationPreferences } from "@/app/(tabs)/profile/notifications/actions";

type NotificationPreferencesProps = {
  id: number;
  userId: number;
  chat: boolean;
  trade: boolean;
  review: boolean;
  badge: boolean;
  stream: boolean;
  system: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

type FormState = {
  ok: boolean;
  error?: string;
};

const initialState: FormState = { ok: false };

type Props = {
  prefs: NotificationPreferencesProps;
};

export default function NotificationSettingsClient({ prefs }: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    updateNotificationPreferences,
    initialState
  );

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      toast.success("알림 설정이 저장되었습니다.");
      router.push("/profile");
    } else if (state.error) {
      toast.error("알림 설정 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* 1. 푸시 알림 (전역 ON/OFF 토글) */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-primary px-1">푸시 알림</h2>
        <div className="panel p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-primary">
              전체 푸시 알림
            </span>
            <p className="text-xs text-muted">기기 알림 권한을 제어합니다.</p>
          </div>
          <PushNotificationToggle />
        </div>
      </section>

      {/* 2. 알림 종류 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-primary px-1">알림 종류</h2>
        <div className="panel divide-y divide-border overflow-hidden">
          {rows.map((row) => (
            <label
              key={row.name}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-dim/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-brand/10 text-brand dark:bg-brand-light/10 dark:text-brand-light text-lg">
                  {row.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">
                    {row.label}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{row.description}</p>
                </div>
              </div>

              <input
                type="checkbox"
                name={row.name}
                defaultChecked={
                  prefs[
                    row.name as keyof NotificationPreferencesProps
                  ] as boolean
                }
                className="size-5 rounded border-border text-brand focus:ring-brand dark:bg-surface-dim"
              />
            </label>
          ))}
        </div>
      </section>

      {/* 3. 방해 금지 시간대 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-primary px-1">방해 금지 시간</h2>
        <div className="panel p-4">
          <p className="text-xs text-muted mb-4">
            설정한 시간 동안에는 푸시 알림이 울리지 않습니다. (중요 알림 제외)
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="time"
                name="quietHoursStart"
                defaultValue={prefs.quietHoursStart ?? ""}
                className="input-primary h-12 text-center"
              />
            </div>
            <span className="text-muted font-medium">~</span>
            <div className="flex-1">
              <input
                type="time"
                name="quietHoursEnd"
                defaultValue={prefs.quietHoursEnd ?? ""}
                className="input-primary h-12 text-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 저장 버튼 */}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98]"
        >
          설정 저장하기
        </button>
      </div>
    </form>
  );
}

const rows = [
  {
    name: "chat",
    label: "채팅 알림",
    icon: "💬",
    description: "새로운 메시지 도착 알림",
  },
  {
    name: "trade",
    label: "거래 알림",
    icon: "⚓",
    description: "예약, 판매 완료 등 거래 상태 변경",
  },
  {
    name: "review",
    label: "리뷰 알림",
    icon: "⭐",
    description: "나에게 작성된 새로운 후기",
  },
  {
    name: "badge",
    label: "뱃지 알림",
    icon: "🎖️",
    description: "새로운 뱃지 획득 축하",
  },
  {
    name: "stream",
    label: "방송 알림",
    icon: "📺",
    description: "팔로우한 선원의 방송 시작",
  },
  {
    name: "system",
    label: "시스템 알림",
    icon: "📢",
    description: "공지사항 및 서비스 안내",
  },
] as const;
