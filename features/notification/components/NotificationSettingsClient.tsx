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
 * 2026.03.14  임도헌   Modified  저장 완료 후 returnTo 경로로 replace 복귀해 설정 화면이 히스토리에 남지 않도록 정리
 * 2026.03.15  임도헌   Modified  방해 금지 시간 기준 문구를 보강하고 키워드 알림 관리를 설정 페이지로 통합
 * 2026.03.15  임도헌   Modified  알림 종류 아이콘을 이모지에서 heroicons 기반 시스템 아이콘으로 통일
 * 2026.03.16  임도헌   Modified  설정 화면에 키워드 알림 토글을 다시 포함해 누락을 해소
 * 2026.03.22  임도헌   Modified  모바일 설정 화면 설명 문구를 더 짧게 다듬어 정보 밀도 완화
 * 2026.03.27  임도헌   Modified  iOS 설치 필요/재연결/권한 분기를 포함한 상태 안내 배너 구조 정리
 * 2026.04.02  임도헌   Modified  푸시 상태 타입 import를 notification/types 공용 정의로 정리
 */

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BellAlertIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlayCircleIcon,
  ShareIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { PushNotificationToggle } from "@/features/notification/components/PushNotificationToggle";
import type { PushNotificationStatus } from "@/features/notification/types";
import { updateNotificationPreferences } from "@/features/notification/actions/preference"; // 경로 수정됨

type NotificationPreferencesProps = {
  id: number;
  userId: number;
  chat: boolean;
  trade: boolean;
  review: boolean;
  badge: boolean;
  stream: boolean;
  keyword: boolean;
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
  returnTo: string;
};

/**
 * 알림 설정 클라이언트 컴포넌트
 *
 * [기능]
 * 1. 전역 푸시 알림 토글 (`PushNotificationToggle`)
 * 2. 알림 유형별(채팅, 거래, 키워드 등) 수신 동의 체크박스
 * 3. 방해 금지 시간 설정 (Start ~ End Time)
 * 4. `updateNotificationPreferences` 액션을 통해 설정을 DB에 저장
 *
 * @param prefs - 초기 설정값 (DB 데이터)
 */
export default function NotificationSettingsClient({
  prefs,
  returnTo,
}: Props) {
  const router = useRouter();
  const [pushStatus, setPushStatus] =
    useState<PushNotificationStatus>("disabled");
  const [state, formAction] = useFormState(
    updateNotificationPreferences,
    initialState
  );

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      toast.success("알림 종류와 방해 금지 시간이 저장되었습니다.");
      router.replace(returnTo);
    } else if (state.error) {
      toast.error(
        state.error ||
          "알림 설정 저장에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
      );
    }
  }, [state, router, returnTo]);

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
          <PushNotificationToggle onStatusChange={setPushStatus} />
        </div>
        {pushStatus === "ios_install_required" ? (
          <div className="mx-1 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShareIcon className="size-4 text-brand dark:text-brand-light" />
              <span>홈 화면에 추가한 뒤 알림을 켤 수 있어요</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              아이폰(iOS) 사파리에서는 공유 버튼을 누른 뒤
              <span className="px-1 font-semibold text-primary">
                홈 화면에 추가
              </span>
              를 먼저 진행해야 합니다.
            </p>
          </div>
        ) : pushStatus === "needs_reconnect" ? (
          <div className="mx-1 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ArrowPathIcon className="size-4 text-brand dark:text-brand-light" />
              <span>이 기기의 알림 연결이 끊어졌어요</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              브라우저 또는 기기 설정 변경으로 연결이 해제되었을 수 있어요.
              오른쪽 스위치를 눌러 다시 연결하면 새 알림을 계속 받을 수
              있습니다.
            </p>
          </div>
        ) : pushStatus === "permission_denied" ? (
          <div className="mx-1 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <BellAlertIcon className="size-4 text-danger" />
              <span>브라우저 알림 권한이 꺼져 있어요</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              사이트 권한에서 알림을 허용해야 기기 푸시를 다시 받을 수
              있습니다.
            </p>
          </div>
        ) : pushStatus === "private_mode" ? (
          <div className="mx-1 rounded-2xl border border-border-subtle bg-surface-dim/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldExclamationIcon className="size-4 text-muted" />
              <span>프라이빗 모드에서는 푸시를 사용할 수 없어요</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              일반 브라우저 창에서 접속하면 기기 알림을 다시 설정할 수
              있습니다.
            </p>
          </div>
        ) : pushStatus === "unsupported" ? (
          <div className="mx-1 rounded-2xl border border-border-subtle bg-surface-dim/40 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ExclamationTriangleIcon className="size-4 text-muted" />
              <span>이 브라우저는 푸시 알림을 지원하지 않아요</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              최신 브라우저나 설치된 앱에서 접속하면 푸시 알림을 받을 수
              있습니다.
            </p>
          </div>
        ) : (
          <p className="px-1 text-xs leading-relaxed text-muted">
            전체 푸시를 끄면 기기 알림은 오지 않습니다.
          </p>
        )}
      </section>

      {/* 2. 알림 종류 설정 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-primary px-1">알림 종류</h2>
        <p className="px-1 text-xs leading-relaxed text-muted">
          필요한 알림만 켜 두세요. 키워드는 아래에서 관리할 수 있습니다.
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
            설정한 시간에는 푸시 알림이 울리지 않습니다. 한국 시간 기준입니다.
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
    icon: <ChatBubbleLeftEllipsisIcon className="size-5" />,
    description: "새로운 메시지 도착 알림",
  },
  {
    name: "trade",
    label: "거래 알림",
    icon: <ArrowsRightLeftIcon className="size-5" />,
    description: "예약, 판매 완료 등 거래 상태 변경",
  },
  {
    name: "review",
    label: "리뷰 알림",
    icon: <ChatBubbleBottomCenterTextIcon className="size-5" />,
    description: "나에게 작성된 새로운 후기",
  },
  {
    name: "badge",
    label: "뱃지 알림",
    icon: <CheckBadgeIcon className="size-5" />,
    description: "새로운 뱃지 획득 축하",
  },
  {
    name: "stream",
    label: "방송 알림",
    icon: <PlayCircleIcon className="size-5" />,
    description: "팔로우한 선원의 방송 시작",
  },
  {
    name: "keyword",
    label: "키워드 알림",
    icon: <MagnifyingGlassIcon className="size-5" />,
    description: "등록한 키워드와 일치하는 상품 등록",
  },
  {
    name: "system",
    label: "시스템 알림",
    icon: <BellAlertIcon className="size-5" />,
    description: "공지사항 및 서비스 안내",
  },
] as const;
