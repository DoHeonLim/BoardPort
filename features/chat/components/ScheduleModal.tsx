/**
 * File Name : features/chat/components/ScheduleModal.tsx
 * Description : 약속(날짜/시간/장소) 설정 모달
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   약속 데이터 입력 UI 및 지도 연동
 */

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  MapPinIcon,
  CalendarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import LocationPicker from "@/features/map/components/LocationPicker";
import type { LocationData } from "@/features/map/types";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: Date, location: LocationData) => void;
}

/**
 * 약속 잡기 모달
 *
 * [기능]
 * 1. 날짜(`date`)와 시간(`time`)을 입력받음.
 * 2. `LocationPicker`를 호출하여 지도상에서 약속 장소를 선택받음.
 * 3. 입력값 검증 후 `onConfirm` 콜백을 통해 데이터를 상위로 전달.
 */
export default function ScheduleModal({
  isOpen,
  onClose,
  onConfirm,
}: ScheduleModalProps) {
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!dateStr || !timeStr || !location) {
      toast.error("날짜, 시간, 장소를 모두 입력해주세요.");
      return;
    }

    const dateTime = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(dateTime.getTime()) || dateTime < new Date()) {
      toast.error("올바른 미래 시간을 선택해주세요.");
      return;
    }

    startTransition(() => {
      onConfirm(dateTime, location);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl overflow-hidden border border-border animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-dim/30">
          <h3 className="font-bold text-primary text-lg flex items-center gap-2">
            <CalendarIcon className="size-5 text-brand" />
            약속 잡기
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded-full"
            aria-label="닫기"
          >
            <XMarkIcon className="size-6 text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* 날짜/시간 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted">날짜</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="input-primary text-sm bg-surface-dim h-10 px-3 rounded-xl w-full border-none ring-1 ring-border focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted">시간</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="input-primary text-sm bg-surface-dim h-10 px-3 rounded-xl w-full border-none ring-1 ring-border focus:ring-brand"
              />
            </div>
          </div>

          {/* 장소 선택 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted">만날 장소</label>
            {location ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-brand/30 shadow-sm group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-brand/10 rounded-full text-brand shrink-0">
                    <MapPinIcon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-primary truncate">
                      {location.locationName}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {location.region2} {location.region3}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMap(true)}
                  className="text-xs text-muted hover:text-brand px-2 py-1"
                >
                  변경
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowMap(true)}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-dim/30 text-muted hover:text-primary hover:bg-surface-dim hover:border-brand/30 transition-all"
              >
                <MapPinIcon className="size-5" />
                <span className="text-sm font-medium">지도에서 장소 선택</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-dim/30 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-secondary h-10 text-sm border-transparent"
            disabled={isPending}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!location || !dateStr || !timeStr || isPending}
            className="btn-primary h-10 text-sm px-6"
          >
            {isPending ? "전송 중..." : "약속 제안하기"}
          </button>
        </div>
      </div>

      {/* LocationPicker Modal */}
      {showMap && (
        <LocationPicker
          onClose={() => setShowMap(false)}
          onSelect={(loc) => {
            setLocation(loc);
            setShowMap(false);
          }}
          initialData={location ?? undefined}
        />
      )}
    </div>
  );
}
