/**
 * File Name : features/notification/components/NotificationSettingsClient
 * Description : 알림 설정 서버 폼 컴포넌트 (알림 종류 + 방해 금지 시간)
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
 * 2026.04.10  임도헌   Modified  notification 타이포 정책에 맞춰 상태 배너 강조 문구 weight를 500 기준으로 정리
 * 2026.04.18  임도헌   Modified  체크박스/시간 입력 폼을 서버 렌더링으로 분리해 초기 설정 페이지 하이드레이션 비용 축소
 * 2026.04.20  임도헌   Modified  알림 설정 체크박스와 행 포커스를 공용 문법에 맞춰 정리
 */

import {
  ArrowsRightLeftIcon,
  BellAlertIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { saveNotificationPreferencesAndRedirect } from "@/features/notification/actions/preference";
import { NotificationSettingsSubmitButton } from "@/features/notification/components/NotificationSettingsSubmitButton";

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

type Props = {
  prefs: NotificationPreferencesProps;
  returnTo: string;
  saveError?: boolean;
};

/**
 * 알림 설정 폼 컴포넌트
 *
 * [기능]
 * 1. 알림 유형별(채팅, 거래, 키워드 등) 수신 동의 체크박스
 * 2. 방해 금지 시간 설정 (Start ~ End Time)
 * 3. 서버 액션을 통해 설정을 DB에 저장하고 복귀 경로로 이동
 *
 * @param prefs - 초기 설정값 (DB 데이터)
 */
export default function NotificationSettingsClient({
  prefs,
  returnTo,
  saveError = false,
}: Props) {
  return (
    <form action={saveNotificationPreferencesAndRedirect} className="flex flex-col gap-6">
      <input type="hidden" name="returnTo" value={returnTo} />

      {saveError ? (
        <div className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-primary">
          <div className="flex items-center gap-2 font-medium">
            <BellAlertIcon className="size-4 text-danger" />
            <span>알림 설정 저장에 실패했어요</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            네트워크 상태를 확인한 뒤 다시 저장해주세요.
          </p>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold text-primary">알림 종류</h2>
        <p className="px-1 text-xs leading-relaxed text-muted">
          필요한 알림만 켜 두세요. 키워드는 아래에서 관리할 수 있습니다.
        </p>
        <div className="panel divide-y divide-border overflow-hidden">
          {rows.map((row) => (
            <label
              key={row.name}
              className="relative flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-surface-dim/30 focus-within:z-[1] focus-within:bg-surface-dim/40 focus-within:ring-1 focus-within:ring-brand/15 dark:focus-within:ring-brand-light/15"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-lg text-brand dark:bg-brand-light/10 dark:text-brand-light">
                  {row.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">
                    {row.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {row.description}
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                name={row.name}
                defaultChecked={
                  prefs[row.name as keyof NotificationPreferencesProps] as boolean
                }
                className="focus-ring-strong size-5 shrink-0 rounded border-border accent-brand dark:accent-brand-light"
              />
            </label>
          ))}
        </div>
      </section>

      <section
        className="space-y-2"
        style={{ contentVisibility: "auto", containIntrinsicSize: "188px" }}
      >
        <h2 className="px-1 text-sm font-bold text-primary">방해 금지 시간</h2>
        <div className="panel p-4">
          <p className="mb-4 text-xs text-muted">
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
            <span className="font-medium text-muted">~</span>
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

      <div className="pt-4">
        <NotificationSettingsSubmitButton />
      </div>
    </form>
  );
}

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
