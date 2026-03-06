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
 * 2026.03.06  임도헌   Modified  저장 버튼 pending 상태 및 중복 제출 방지 처리 추가
 * 2026.03.07  임도헌   Modified  알림 유형/전역 푸시 관계 설명을 보강해 투명성 기준(v1.2) 반영
 */

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PushNotificationToggle } from "@/features/notification/components/PushNotificationToggle";
import { updateNotificationPreferences } from "@/features/notification/actions/preference"; // 경로 수정됨

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

/**
 * 알림 설정 클라이언트 컴포넌트
 *
 * [기능]
 * 1. 전역 푸시 알림 토글 (`PushNotificationToggle`)
 * 2. 알림 유형별(채팅, 거래 등) 수신 동의 체크박스
 * 3. 방해 금지 시간 설정 (Start ~ End Time)
 * 4. `updateNotificationPreferences` 액션을 통해 설정을 DB에 저장
 *
 * @param prefs - 초기 설정값 (DB 데이터)
 */
export default function NotificationSettingsClient({ prefs }: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    updateNotificationPreferences,
    initialState
  );

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      toast.success("알림 종류와 방해 금지 시간이 저장되었습니다.");
      router.push("/profile");
    } else if (state.error) {
      toast.error(
        state.error ||
          "알림 설정 저장에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
      );
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
        <p className="px-1 text-xs leading-relaxed text-muted">
          전체 푸시 알림을 끄면 아래 알림 종류가 켜져 있어도 기기 알림은 오지
          않습니다. 알림 종류와 방해 금지 시간은 계정 설정으로 저장됩니다.
        </p>
      </section>

      {/* 2. 알림 종류 설정 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-primary px-1">알림 종류</h2>
        <p className="px-1 text-xs leading-relaxed text-muted">
          어떤 상황에서 알림을 받을지 선택합니다. 필요한 유형만 켜 두면 알림
          피로도를 줄일 수 있습니다.
        </p>
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

      {/* 3. 방해 금지 시간대 설정 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-primary px-1">방해 금지 시간</h2>
        <div className="panel p-4">
          <p className="text-xs text-muted mb-4">
            설정한 시간 동안에는 푸시 알림이 울리지 않습니다. 긴급한 보안/정책
            안내는 예외로 표시될 수 있습니다.
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="time"
                name="quietHoursStart"
                defaultValue={prefs.quietHoursStart ?? ""}
                className="input-primary h-12 text-center"
                aria-label="시작 시간"
              />
            </div>
            <span className="text-muted font-medium">~</span>
            <div className="flex-1">
              <input
                type="time"
                name="quietHoursEnd"
                defaultValue={prefs.quietHoursEnd ?? ""}
                className="input-primary h-12 text-center"
                aria-label="종료 시간"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 저장 버튼 */}
      <div className="pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-12 btn-primary rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "저장 중..." : "설정 저장하기"}
    </button>
  );
}

// 알림 유형 데이터
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
