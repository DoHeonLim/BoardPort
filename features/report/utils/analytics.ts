/**
 * File Name : features/report/utils/analytics.ts
 * Description : 관리자 대시보드용 통계 계산 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   calculateTrend 함수 분리
 * 2026.03.29  임도헌   Modified  관리자 차트용 최근 N일/N시간 버킷과 그룹 집계 유틸을 추가
 */

/**
 * 전월 대비 증감률 문자열 계산
 *
 * @param current - 현재 수치
 * @param previous - 지난달 수치
 * @returns {string | undefined} 포맷팅된 증감률 문자열 (예: "+12.5% (지난달 대비)")
 */
export function calculateTrend(
  current: number,
  previous: number
): string | undefined {
  if (previous === 0) return undefined; // 이전 데이터가 0이면 계산 불가
  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}% (지난달 대비)`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function startOfHour(date: Date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function formatHour(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}시`;
}

/**
 * 최근 N일을 오늘까지 포함한 일 단위 버킷으로 정규화
 */
export function buildRecentDayBuckets(
  dates: Date[],
  days: number,
  now: Date = new Date()
) {
  const end = startOfDay(now);
  const start = new Date(end);
  start.setDate(end.getDate() - days + 1);

  const labels = Array.from({ length: days }, (_, index) => {
    const cursor = new Date(start);
    cursor.setDate(start.getDate() + index);
    return formatMonthDay(cursor);
  });

  const values = Array.from({ length: days }, () => 0);

  dates.forEach((date) => {
    const bucketDate = startOfDay(date);
    const diff = Math.floor(
      (bucketDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff < days) {
      values[diff] += 1;
    }
  });

  return { labels, values };
}

/**
 * 최근 N시간을 현재 시간까지 포함한 시간 단위 버킷으로 정규화
 */
export function buildRecentHourBuckets(
  dates: Date[],
  hours: number,
  now: Date = new Date()
) {
  const end = startOfHour(now);
  const start = new Date(end);
  start.setHours(end.getHours() - hours + 1);

  const labels = Array.from({ length: hours }, (_, index) => {
    const cursor = new Date(start);
    cursor.setHours(start.getHours() + index);
    return formatHour(cursor);
  });

  const values = Array.from({ length: hours }, () => 0);

  dates.forEach((date) => {
    const bucketDate = startOfHour(date);
    const diff = Math.floor(
      (bucketDate.getTime() - start.getTime()) / (1000 * 60 * 60)
    );
    if (diff >= 0 && diff < hours) {
      values[diff] += 1;
    }
  });

  return { labels, values };
}

/**
 * 최근 N일 데이터를 key 기준으로 날짜별 그룹 버킷으로 집계
 */
export function buildRecentGroupedDayBuckets<Key extends string>(
  items: Array<{ created_at: Date; key: Key }>,
  days: number,
  keys: readonly Key[],
  now: Date = new Date()
) {
  const end = startOfDay(now);
  const start = new Date(end);
  start.setDate(end.getDate() - days + 1);

  const labels = Array.from({ length: days }, (_, index) => {
    const cursor = new Date(start);
    cursor.setDate(start.getDate() + index);
    return formatMonthDay(cursor);
  });

  const grouped = Object.fromEntries(
    keys.map((key) => [key, Array.from({ length: days }, () => 0)])
  ) as Record<Key, number[]>;

  items.forEach((item) => {
    const bucketDate = startOfDay(item.created_at);
    const diff = Math.floor(
      (bucketDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff < days && grouped[item.key]) {
      grouped[item.key][diff] += 1;
    }
  });

  return { labels, grouped };
}

/**
 * key별 단순 count 집계 생성
 */
export function countItemsByKey<Key extends string>(
  items: Key[],
  keys: readonly Key[]
) {
  return keys.reduce(
    (acc, key) => {
      acc[key] = items.filter((item) => item === key).length;
      return acc;
    },
    {} as Record<Key, number>
  );
}
