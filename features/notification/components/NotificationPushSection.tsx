/**
 * File Name : features/notification/components/NotificationPushSection.tsx
 * Description : 알림 설정 페이지의 푸시 토글 전용 클라이언트 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.18  임도헌   Created   푸시 토글/상태 배너만 별도 클라이언트 섬으로 분리해 설정 페이지 초기 JS 부담 축소
 */

"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { PushNotificationToggle } from "@/features/notification/components/PushNotificationToggle";
import type { PushNotificationStatus } from "@/features/notification/types";

export default function NotificationPushSection() {
  const [pushStatus, setPushStatus] =
    useState<PushNotificationStatus>("disabled");

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-bold text-primary">푸시 알림</h2>
      <div className="panel flex items-center justify-between p-4">
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
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShareIcon className="size-4 text-brand dark:text-brand-light" />
            <span>홈 화면에 추가한 뒤 알림을 켤 수 있어요</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            아이폰(iOS) 사파리에서는 공유 버튼을 누른 뒤
            <span className="px-1 font-medium text-primary">
              홈 화면에 추가
            </span>
            를 먼저 진행해야 합니다.
          </p>
        </div>
      ) : pushStatus === "needs_reconnect" ? (
        <div className="mx-1 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
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
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
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
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
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
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
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
  );
}
