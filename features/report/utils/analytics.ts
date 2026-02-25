/**
 * File Name : features/report/utils/analytics.ts
 * Description : 관리자 대시보드용 통계 계산 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   calculateTrend 함수 분리
 */

/**
 * 증감률 계산 및 포맷팅
 * - 지난달 데이터와 현재 데이터를 비교하여 증감률 문자열 반환
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
