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
}

/**
 * 약속 정보(시간, 장소, 지도)를 보여주는 카드 컴포넌트
 *
 * [상태별 UI]
 * - PENDING: 제안자에게는 '취소', 수신자에게는 '수락/거절' 버튼 노출
 * - ACCEPTED: 초록색 '확정됨' 뱃지 표시
 * - CANCELED/REJECTED: 불투명 처리 및 상태 뱃지 표시
 */
export default function AppointmentBubble({
  message,
  isOwnMessage,
  currentUserId,
  isCounterpartyLeft = false,
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
  const isDead =
    status === "REJECTED" ||
    status === "CANCELED" ||
    (status === "PENDING" && isExpired);
  const actionName = isProposer ? "취소" : "거절";

  return (
    <>
      <div
        className={cn(
          "w-[260px] sm:w-[300px] rounded-2xl overflow-hidden border shadow-sm transition-all bg-surface",
          isOwnMessage
            ? "border-brand-light/20 dark:border-brand-light/40"
            : "border-border",
          isDead && "opacity-60 grayscale"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "px-4 py-3 flex items-center gap-2 border-b",
            isOwnMessage
              ? "border-brand-light/10 bg-brand/5 dark:bg-brand-light/10 text-primary"
              : "border-border bg-surface-dim/50 text-primary"
          )}
        >
          <CalendarDaysIcon className="size-5 text-brand dark:text-brand-light" />
          <span className="font-bold text-sm">
            {status === "PENDING" && isExpired ? "만료된 제안" : "약속 제안"}
          </span>

          {status === "PENDING" && isExpired && (
            <span className="ml-auto text-[10px] font-bold bg-neutral-400 text-white px-2 py-0.5 rounded-full">
              기간만료
            </span>
          )}
          {isAccepted && (
            <span className="ml-auto text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
              확정됨
            </span>
          )}
          {status === "CANCELED" && (
            <span className="ml-auto text-[10px] font-bold bg-neutral-500 text-white px-2 py-0.5 rounded-full">
              취소됨
            </span>
          )}
          {status === "REJECTED" && (
            <span className="ml-auto text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
              거절됨
            </span>
          )}
        </div>

        {/* Body: Map & Info */}
        <div className="flex flex-col">
          {/* 순수 지도 영역 (클릭 및 호버 효과 추가) */}
          <div
            className="relative h-32 w-full border-b border-border/50 bg-surface-dim cursor-pointer group"
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
                {/* Hover Overlay: 돋보기 아이콘 */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <MagnifyingGlassPlusIcon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
              </>
            )}
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <CalendarDaysIcon className="size-5 shrink-0 mt-0.5 opacity-70 text-muted" />
              <div>
                <p className="text-[11px] font-medium opacity-70 text-muted">
                  일시
                </p>
                <p className="text-sm font-bold text-primary">{dateText}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPinIcon className="size-5 shrink-0 mt-0.5 opacity-70 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium opacity-70 text-muted">
                  장소
                </p>
                <p className="text-sm font-bold leading-tight text-primary truncate">
                  {apt.location}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Actions */}
        {status === "PENDING" && !isExpired && (
          <div
            className={cn(
              "flex border-t",
              isOwnMessage
                ? "border-brand-light/10 divide-brand-light/10"
                : "border-border divide-border",
              "divide-x"
            )}
          >
            {isProposer ? (
              <button
                onClick={() => setIsConfirmOpen(true)}
                disabled={isActionDisabled}
                className="flex-1 py-3 text-sm font-medium text-primary transition-colors hover:bg-surface-dim disabled:opacity-50"
              >
                약속 취소하기
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isActionDisabled}
                  className="flex-1 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50 text-red-500 transition-colors"
                >
                  거절
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isActionDisabled}
                  className="flex-1 py-3 text-sm font-bold hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-50 text-green-600 transition-colors"
                >
                  수락하기
                </button>
              </>
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
