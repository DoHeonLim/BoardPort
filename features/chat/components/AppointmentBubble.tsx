/**
 * File Name : features/chat/components/AppointmentBubble.tsx
 * Description : 채팅방 내 약속 카드 UI (상태 표시 및 액션)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   약속 상태별 UI 및 액션(수락/취소) 구현
 * 2026.02.20  임도헌   Modified  지도 레이아웃 깨짐 현상 수정 및 StaticMap 직접 구현으로 교체
 * 2026.02.20  임도헌   Modified  지도 클릭 시 확대되는 지도 모달 추가
 * 2026.02.22  임도헌   Modified  Ghost User(나간 유저)일 경우 액션 버튼 비활성화 처리
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.12  임도헌   Modified  약속 상태 배지와 액션 버튼을 시맨틱 토큰 기반 톤으로 통일
 * 2026.03.27  임도헌   Modified  약속 카드 상태 표현과 액션 위계를 재정리해 라이트/다크 가독성을 개선
 * 2026.03.27  임도헌   Modified  수락 버튼에 다크 밀집 화면용 primary 버튼 톤을 적용
 * 2026.03.28  임도헌   Modified  현재 대화 검색 하이라이트를 카드 표면에 적용할 수 있도록 searchHighlight 톤 지원 추가
 */

"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { MagnifyingGlassPlusIcon } from "@heroicons/react/24/outline";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import useKakaoLoader from "@/features/map/hooks/useKakaoLoader";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import {
  acceptAppointmentAction,
  cancelAppointmentAction,
} from "@/features/chat/actions/appointment";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/features/chat/types";

const AppointmentMapModal = dynamic(() => import("./AppointmentMapModal"), {
  ssr: false,
});

interface Props {
  message: ChatMessage;
  isOwnMessage: boolean;
  currentUserId: number;
  isCounterpartyLeft?: boolean;
  searchHighlight?: "active" | "hit" | null;
}

/**
 * 약속 정보(시간, 장소, 지도)를 보여주는 카드 컴포넌트
 *
 * [상태별 UI]
 * - PENDING: 제안자에게는 '취소', 수신자에게는 '수락/거절' 버튼 노출
 * - ACCEPTED: 초록색 '확정됨' 뱃지 표시
 * - CANCELED/REJECTED/EXPIRED: 카드 가독성은 유지하고 상태 배지로 결과를 안내
 */
export default function AppointmentBubble({
  message,
  isOwnMessage,
  currentUserId,
  isCounterpartyLeft = false,
  searchHighlight = null,
}: Props) {
  const apt = message.appointment;
  const [isPending, startTransition] = useTransition();
  const { loading, error } = useKakaoLoader();

  // 로컬 낙관적 상태 추가
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  // 지도 확대 상태
  const [isMapZoomed, setIsMapZoomed] = useState(false);
  // 모달 제어 상태
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (!apt) return null;

  // 제안한 사람
  const isProposer = apt.proposerId === currentUserId;
  // 시간이 지났는지 체크
  const isExpired = new Date(apt.meetDate) < new Date();

  // 상대방이 나갔거나, 만료되었거나, 이미 처리된 상태면 액션 불가
  const isActionDisabled = isPending || isCounterpartyLeft;

  // 서버 상태보다 낙관적 상태를 우선
  const status = optimisticStatus ?? apt.status; // "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED"

  const dateText = format(new Date(apt.meetDate), "M월 d일 (eee) a h:mm", {
    locale: ko,
  });

  // 수락 핸들러
  const handleAccept = () => {
    setOptimisticStatus("ACCEPTED"); // 즉시 확정 상태로 UI 변경
    startTransition(async () => {
      const res = await acceptAppointmentAction(apt.id);
      if (res.success) {
        toast.success("약속을 수락했습니다! 상품이 예약됩니다.");
      } else {
        toast.error(res.error);
        setOptimisticStatus(null); // 롤백
      }
    });
  };

  // 취소/거절 핸들러 (ConfirmDialog에서 호출됨)
  const handleCancel = () => {
    const actionName = isProposer ? "취소" : "거절";
    const nextStatus = isProposer ? "CANCELED" : "REJECTED";

    setOptimisticStatus(nextStatus); // 즉시 취소/거절 UI 반영
    setIsConfirmOpen(false); // 모달 닫기

    startTransition(async () => {
      const res = await cancelAppointmentAction(apt.id);
      if (res.success) {
        toast.success(`약속이 ${actionName}되었습니다.`);
      } else {
        toast.error(res.error);
        setOptimisticStatus(null); // 롤백
      }
    });
  };

  const isAccepted = status === "ACCEPTED";
  const isRejected = status === "REJECTED";
  const isCanceled = status === "CANCELED";
  const isExpiredPending = status === "PENDING" && isExpired;
  const isDead = isRejected || isCanceled || isExpiredPending;
  const actionName = isProposer ? "취소" : "거절";
  const cardHighlightClass = cn(
    searchHighlight === "active" &&
      "ring-2 ring-brand/55 ring-offset-2 ring-offset-background dark:ring-brand-light/60 shadow-lg",
    searchHighlight === "hit" &&
      "ring-1 ring-brand/35 ring-offset-1 ring-offset-background dark:ring-brand-light/40 shadow-md"
  );

  return (
    <>
      <div
        className={cn(
          "w-[260px] overflow-hidden rounded-2xl border bg-surface shadow-md transition-all sm:w-[300px]",
          isOwnMessage
            ? "border-brand-light/20 dark:border-brand-light/40"
            : "border-border",
          cardHighlightClass
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 border-b px-4 py-3",
            isOwnMessage
              ? "border-brand-light/10 bg-brand/5 text-primary dark:bg-brand-light/10"
              : "border-border bg-surface-dim/80 text-primary",
            isDead && "bg-surface-dim"
          )}
        >
          <CalendarDaysIcon className="size-5 text-brand dark:text-brand-light" />
          <span className="font-bold text-sm">
            {isExpiredPending ? "만료된 제안" : "약속 제안"}
          </span>

          {isExpiredPending && (
            <span className="ml-auto rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-primary">
              기간만료
            </span>
          )}
          {isAccepted && (
            <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow-sm">
              확정됨
            </span>
          )}
          {isCanceled && (
            <span className="ml-auto rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
              취소됨
            </span>
          )}
          {isRejected && (
            <span className="ml-auto rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
              거절됨
            </span>
          )}
        </div>

        {/* Body: Map & Info */}
        <div className="flex flex-col">
          {/* 순수 지도 영역 (클릭 및 호버 효과 추가) */}
          <div
            className="group relative h-28 w-full cursor-pointer border-b border-border/50 bg-surface-dim"
            onClick={() => setIsMapZoomed(true)} // 클릭 시 확대 모달 오픈
            role="button"
            aria-label="지도 크게 보기"
          >
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-muted">
                지도 로딩 중...
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-xs text-danger">
                지도 오류
              </div>
            ) : (
              <>
                {/* 
                  내부 지도 컴포넌트 클릭 이벤트 방지를 위해 
                  pointer-events-none을 wrapper에 적용 
                */}
                <div className="absolute inset-0 pointer-events-none">
                  <Map
                    center={{ lat: apt.latitude, lng: apt.longitude }}
                    style={{ width: "100%", height: "100%" }}
                    level={4}
                    draggable={false}
                    zoomable={false}
                    disableDoubleClickZoom={true}
                  >
                    <MapMarker
                      position={{ lat: apt.latitude, lng: apt.longitude }}
                    />
                  </Map>
                </div>
                {isDead && (
                  <div className="absolute inset-0 bg-background/20 dark:bg-background/35" />
                )}
                {/* Hover Overlay: 돋보기 아이콘 */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <MagnifyingGlassPlusIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
              </>
            )}
          </div>

          <div className="space-y-3.5 p-4">
            <div className="flex items-start gap-2.5">
              <CalendarDaysIcon className="mt-0.5 size-5 shrink-0 text-muted" />
              <div>
                <p className="text-[11px] font-semibold text-muted">일시</p>
                <p className="text-sm font-bold text-primary">{dateText}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPinIcon className="mt-0.5 size-5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-muted">장소</p>
                <p className="text-sm font-bold leading-tight text-primary truncate">
                  {apt.location}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Actions */}
        {status === "PENDING" && !isExpired && (
          <div className="border-t border-border-subtle bg-surface px-3 py-3">
            {isProposer ? (
              <button
                onClick={() => setIsConfirmOpen(true)}
                disabled={isActionDisabled}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-surface-dim px-4 text-sm font-semibold text-primary transition-colors hover:bg-surface disabled:opacity-50"
              >
                약속 취소하기
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isActionDisabled}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-danger/20 bg-danger/5 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                >
                  거절
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isActionDisabled}
                  className="btn-primary-quiet-dark inline-flex h-11 items-center justify-center px-4 text-sm font-bold shadow-sm disabled:opacity-50"
                >
                  수락하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        title={`약속 ${actionName}`}
        description={`이 약속을 정말 ${actionName}하시겠습니까?`}
        confirmLabel={actionName}
        cancelLabel="닫기"
        onConfirm={handleCancel}
        onCancel={() => setIsConfirmOpen(false)}
        loading={isPending}
      />

      {/* 지도 확대 모달 */}
      {isMapZoomed && (
        <AppointmentMapModal
          latitude={apt.latitude}
          longitude={apt.longitude}
          locationName={apt.location}
          onClose={() => setIsMapZoomed(false)}
        />
      )}
    </>
  );
}
