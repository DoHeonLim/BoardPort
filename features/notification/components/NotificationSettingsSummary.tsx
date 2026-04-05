/**
 * File Name : features/notification/components/NotificationSettingsSummary.tsx
 * Description : 알림 센터 상단의 설정 요약 카드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.15  임도헌   Created   알림 센터에서 푸시/방해 금지/키워드 현황을 한눈에 보여주는 요약 카드 추가
 */

import Link from "next/link";
import {
  BellIcon,
  ClockIcon,
  Cog6ToothIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

type Props = {
  pushEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  keywordCount: number;
  settingsHref: string;
};

/**
 * 알림 센터 상단 요약 카드
 *
 * [기능]
 * - 전체 푸시 상태, 방해 금지 시간, 등록된 키워드 개수 요약
 * - 상세 설정 페이지로 이동하는 바로가기 제공
 *
 * @param pushEnabled - 전체 푸시 허용 여부
 * @param quietHoursStart - 방해 금지 시작 시간
 * @param quietHoursEnd - 방해 금지 종료 시간
 * @param keywordCount - 등록된 키워드 개수
 * @param settingsHref - 알림 설정 페이지 링크
 */
export default function NotificationSettingsSummary({
  pushEnabled,
  quietHoursStart,
  quietHoursEnd,
  keywordCount,
  settingsHref,
}: Props) {
  const quietHoursLabel =
    quietHoursStart && quietHoursEnd
      ? `${quietHoursStart} ~ ${quietHoursEnd}`
      : "설정 안 함";

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-primary">알림 설정 요약</h2>
          <p className="text-xs leading-relaxed text-muted">
            푸시 상태와 방해 금지 시간, 키워드 알림 현황을 빠르게 확인
          </p>
        </div>
        <Link
          href={settingsHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-brand transition-colors hover:bg-brand/10 dark:text-brand-light dark:hover:bg-brand-light/10"
        >
          <Cog6ToothIcon className="size-4" />
          설정
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-background px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <BellIcon className="size-4 text-brand dark:text-brand-light" />
            전체 푸시
          </div>
          <p className="mt-1 text-sm font-medium text-primary">
            {pushEnabled ? "켜짐" : "꺼짐"}
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-background px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <ClockIcon className="size-4 text-brand dark:text-brand-light" />
            방해 금지
          </div>
          <p className="mt-1 text-sm font-medium text-primary">
            {quietHoursLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">한국 시간 기준</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-background px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <TagIcon className="size-4 text-brand dark:text-brand-light" />
            키워드 알림
          </div>
          <p className="mt-1 text-sm font-medium text-primary">
            {keywordCount}개 등록
          </p>
        </div>
      </div>
    </section>
  );
}
