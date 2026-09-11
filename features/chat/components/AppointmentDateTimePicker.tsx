/**
 * File Name : features/chat/components/AppointmentDateTimePicker.tsx
 * Description : 거래 약속용 월별 날짜·시간 선택 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   주간 달력과 오전·오후 시·분 선택을 한 흐름으로 구성
 * 2026.09.09  임도헌   Modified  현재 연도 월 이동과 요소 내부 가로 스크롤 날짜 선택 방식으로 변경
 * 2026.09.09  임도헌   Modified  PC Shift+휠 방향 전환이 멈추지 않도록 스냅 제거와 가로 이동 정규화
 * 2026.09.09  임도헌   Modified  연·월 선택 패널과 연도 경계를 넘는 월 이동 추가
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_MINUTE_INTERVAL,
  formatAppointmentDateValue,
  getAppointmentMonthDates,
} from "@/features/chat/utils/appointmentPicker";

interface AppointmentDateTimePickerProps {
  date: string;
  hour: string;
  minute: string;
  minimumDateTime: Date;
  onDateChange: (date: string) => void;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
}

type Period = "AM" | "PM";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
const DISPLAY_HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from(
  { length: 60 / APPOINTMENT_MINUTE_INTERVAL },
  (_, index) => String(index * APPOINTMENT_MINUTE_INTERVAL).padStart(2, "0")
);

const formatDateAriaLabel = (date: Date, weekday: string) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}요일`;

const toHourValue = (displayHour: number, period: Period) => {
  const hour = period === "AM" ? displayHour % 12 : (displayHour % 12) + 12;
  return String(hour).padStart(2, "0");
};

/**
 * 연·월을 이동하고 날짜 선택 후 시간을 단계적으로 고른다.
 * 모든 조작을 button으로 제공해 브라우저별 네이티브 picker 차이를 제거한다.
 */
export default function AppointmentDateTimePicker({
  date,
  hour,
  minute,
  minimumDateTime,
  onDateChange,
  onHourChange,
  onMinuteChange,
}: AppointmentDateTimePickerProps) {
  const minimumDate = formatAppointmentDateValue(minimumDateTime);
  const minimumHour = String(minimumDateTime.getHours()).padStart(2, "0");
  const minimumMinute = String(minimumDateTime.getMinutes()).padStart(2, "0");
  const initialDate = date ? new Date(`${date}T00:00:00`) : minimumDateTime;
  const minimumYear = minimumDateTime.getFullYear();
  const minimumMonth = minimumDateTime.getMonth();
  const [visibleYear, setVisibleYear] = useState(initialDate.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(initialDate.getMonth());
  const [pickerYear, setPickerYear] = useState(initialDate.getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const dateScrollerRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<Period>(() => {
    if (hour) return Number(hour) < 12 ? "AM" : "PM";
    return minimumDateTime.getHours() < 12 ? "AM" : "PM";
  });

  const dates = useMemo(
    () => getAppointmentMonthDates(visibleYear, visibleMonth),
    [visibleYear, visibleMonth]
  );
  const canGoPrevious =
    visibleYear > minimumYear || visibleMonth > minimumMonth;

  useEffect(() => {
    const scroller = dateScrollerRef.current;
    const selectedButton = scroller?.querySelector<HTMLElement>(
      `[data-appointment-date="${date}"]`
    );
    if (scroller && selectedButton && typeof scroller.scrollTo === "function") {
      scroller.scrollTo({
        left:
          selectedButton.offsetLeft -
          (scroller.clientWidth - selectedButton.offsetWidth) / 2,
      });
    }
  }, [date, isMonthPickerOpen, visibleMonth, visibleYear]);

  useEffect(() => {
    const scroller = dateScrollerRef.current;
    if (!scroller) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.shiftKey) return;

      const delta = event.deltaX || event.deltaY;
      if (!delta) return;

      event.preventDefault();
      scroller.scrollLeft += delta;
    };

    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", handleWheel);
  }, [isMonthPickerOpen]);

  const moveMonth = (amount: number) => {
    const nextMonth = new Date(visibleYear, visibleMonth + amount, 1);
    setVisibleYear(nextMonth.getFullYear());
    setVisibleMonth(nextMonth.getMonth());
    setPickerYear(nextMonth.getFullYear());
    setIsMonthPickerOpen(false);
  };

  const toggleMonthPicker = () => {
    setPickerYear(visibleYear);
    setIsMonthPickerOpen((current) => !current);
  };

  const selectMonth = (month: number) => {
    setVisibleYear(pickerYear);
    setVisibleMonth(month);
    setIsMonthPickerOpen(false);
  };

  const selectDate = (nextDate: string) => {
    onDateChange(nextDate);

    if (
      nextDate === minimumDate &&
      hour &&
      `${hour}:${minute || "00"}` < `${minimumHour}:${minimumMinute}`
    ) {
      onHourChange("");
      onMinuteChange("");
    }
  };

  const selectPeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);

    if (!hour) return;
    const displayHour = Number(hour) % 12 || 12;
    const nextHour = toHourValue(displayHour, nextPeriod);
    onHourChange(nextHour);

    if (
      date === minimumDate &&
      `${nextHour}:${minute || "00"}` < `${minimumHour}:${minimumMinute}`
    ) {
      onMinuteChange("");
    }
  };

  const selectedDate = date ? new Date(`${date}T00:00:00`) : null;
  const selectedDateLabel = selectedDate
    ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`
    : null;
  const selectedTimeLabel =
    hour && minute
      ? `${Number(hour) < 12 ? "오전" : "오후"} ${Number(hour) % 12 || 12}:${minute}`
      : null;
  const optionClass =
    "focus-ring-soft min-h-10 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="w-full min-w-0 space-y-4 overflow-hidden">
      <fieldset className="min-w-0 space-y-3">
        <legend className="sr-only">약속 날짜</legend>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            disabled={!canGoPrevious}
            className="focus-ring-soft inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="이전 달"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleMonthPicker}
            aria-expanded={isMonthPickerOpen}
            className="focus-ring-soft min-h-10 min-w-0 rounded-xl px-3 text-center text-sm font-bold text-primary transition-colors hover:bg-surface-dim"
          >
            {visibleYear}년 {visibleMonth + 1}월
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="focus-ring-soft inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface text-muted transition-colors hover:bg-surface-dim hover:text-primary"
            aria-label="다음 달"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>

        {isMonthPickerOpen ? (
          <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-dim p-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerYear((current) => current - 1)}
                disabled={pickerYear <= minimumYear}
                className="focus-ring-soft inline-flex size-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="이전 해"
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <p className="text-sm font-bold text-primary">{pickerYear}년</p>
              <button
                type="button"
                onClick={() => setPickerYear((current) => current + 1)}
                className="focus-ring-soft inline-flex size-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-primary"
                aria-label="다음 해"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2" aria-label="월 선택">
              {MONTH_LABELS.map((label, month) => {
                const isPast =
                  pickerYear === minimumYear && month < minimumMonth;
                const isSelected =
                  pickerYear === visibleYear && month === visibleMonth;

                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => selectMonth(month)}
                    disabled={isPast}
                    aria-pressed={isSelected}
                    className={cn(
                      "focus-ring-soft min-h-10 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                      isSelected
                        ? "border-brand bg-brand text-white dark:border-brand-light dark:bg-brand-dark dark:text-brand-light"
                        : "border-border-subtle bg-surface text-primary hover:bg-surface"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            ref={dateScrollerRef}
            className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scrollbar-thin scrollbar-thumb-border dark:scrollbar-thumb-neutral-700"
            aria-label="약속 날짜 선택"
          >
            {dates.map((item) => {
              const value = formatAppointmentDateValue(item);
              const isSelected = value === date;
              const isPast = value < minimumDate;
              const isToday = value === formatAppointmentDateValue(new Date());
              const weekday = WEEKDAY_LABELS[item.getDay()];

              return (
                <button
                  type="button"
                  key={value}
                  data-appointment-date={value}
                  onClick={() => selectDate(value)}
                  disabled={isPast}
                  aria-label={formatDateAriaLabel(item, weekday)}
                  aria-pressed={isSelected}
                  className={cn(
                    "focus-ring-soft flex min-h-[64px] w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                    isSelected
                      ? "border-brand bg-brand text-white dark:border-brand-light dark:bg-brand-dark dark:text-brand-light"
                      : "border-border-subtle bg-surface text-muted hover:border-brand/40 hover:bg-surface-dim hover:text-primary dark:hover:border-brand-light/40",
                    isToday &&
                      !isSelected &&
                      "border-brand/50 text-brand dark:border-brand-light/50 dark:text-brand-light"
                  )}
                >
                  <span>{weekday}</span>
                  <span className="text-sm font-bold">{item.getDate()}</span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {date ? (
        <fieldset className="min-w-0 space-y-3">
          <legend className="text-xs font-bold text-muted">시간</legend>

          <div className="grid grid-cols-2 gap-2" aria-label="오전 오후 선택">
            {(["AM", "PM"] as const).map((item) => {
              const isUnavailable =
                date === minimumDate &&
                item === "AM" &&
                Number(minimumHour) >= 12;

              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => selectPeriod(item)}
                  disabled={isUnavailable}
                  aria-pressed={period === item}
                  className={cn(
                    optionClass,
                    period === item
                      ? "border-brand bg-brand/10 text-brand dark:border-brand-light dark:bg-brand-light/15 dark:text-brand-light"
                      : "border-border-subtle bg-surface text-muted hover:bg-surface-dim hover:text-primary"
                  )}
                >
                  {item === "AM" ? "오전" : "오후"}
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-1.5 text-xs text-muted">시</p>
            <div className="grid grid-cols-6 gap-1.5">
              {DISPLAY_HOURS.map((displayHour) => {
                const value = toHourValue(displayHour, period);
                const isSelected = value === hour;
                const isPast = date === minimumDate && value < minimumHour;

                return (
                  <button
                    type="button"
                    key={displayHour}
                    onClick={() => {
                      onHourChange(value);
                      if (
                        date === minimumDate &&
                        value === minimumHour &&
                        minute < minimumMinute
                      ) {
                        onMinuteChange("");
                      }
                    }}
                    disabled={isPast}
                    aria-label={`${period === "AM" ? "오전" : "오후"} ${displayHour}시`}
                    aria-pressed={isSelected}
                    className={cn(
                      optionClass,
                      isSelected
                        ? "border-brand bg-brand text-white dark:border-brand-light dark:bg-brand-dark dark:text-brand-light"
                        : "border-border-subtle bg-surface text-primary hover:bg-surface-dim"
                    )}
                  >
                    {displayHour}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-muted">분</p>
            <div className="grid grid-cols-6 gap-1.5">
              {MINUTES.map((value) => {
                const isSelected = value === minute;
                const isPast =
                  date === minimumDate &&
                  hour === minimumHour &&
                  value < minimumMinute;

                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => onMinuteChange(value)}
                    disabled={!hour || isPast}
                    aria-label={`${value}분`}
                    aria-pressed={isSelected}
                    className={cn(
                      optionClass,
                      isSelected
                        ? "border-brand bg-brand text-white dark:border-brand-light dark:bg-brand-dark dark:text-brand-light"
                        : "border-border-subtle bg-surface text-primary hover:bg-surface-dim"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>
      ) : (
        <p className="rounded-xl bg-surface-dim px-3 py-2.5 text-center text-xs text-muted">
          날짜를 선택하면 시간을 고를 수 있습니다.
        </p>
      )}

      {(selectedDateLabel || selectedTimeLabel) && (
        <div
          className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm font-medium text-primary dark:border-brand-light/20 dark:bg-brand-light/10"
          aria-live="polite"
        >
          <ClockIcon className="size-4 shrink-0 text-brand dark:text-brand-light" />
          <span>
            {selectedDateLabel}
            {selectedTimeLabel
              ? ` · ${selectedTimeLabel}`
              : " · 시간 선택 필요"}
          </span>
        </div>
      )}
    </div>
  );
}
